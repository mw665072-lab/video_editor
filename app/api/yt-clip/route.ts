import { NextResponse } from 'next/server'
import { detectVideoPlatform, getYouTubeVideoId } from '@/lib/videoUtils'
import path from 'path'
import fs from 'fs'

export const runtime = 'nodejs'

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': '*',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

// ─── yt-dlp binary management ─────────────────────────────────────────────────

function getYtDlpBinaryPath(): string {
  // Place inside node_modules/yt-dlp-wrap or a known writable location
  const ytDlpWrapDir = path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin')
  const binaryName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
  return path.join(ytDlpWrapDir, binaryName)
}

async function ensureYtDlpBinary(): Promise<string> {
  const binaryPath = getYtDlpBinaryPath()

  if (fs.existsSync(binaryPath)) {
    return binaryPath
  }

  console.log('[yt-clip] yt-dlp binary not found, downloading from GitHub…')

  const YTDlpWrapModule = await import('yt-dlp-wrap')
  const YTDlpWrap: any = (YTDlpWrapModule as any).default ?? (YTDlpWrapModule as any).YTDlpWrap ?? YTDlpWrapModule

  // Ensure directory exists
  fs.mkdirSync(path.dirname(binaryPath), { recursive: true })

  await YTDlpWrap.downloadFromGithub(binaryPath)
  console.log('[yt-clip] yt-dlp binary downloaded to', binaryPath)

  return binaryPath
}

// ─── YouTube URL helpers ───────────────────────────────────────────────────────

function normalizeYouTubeUrl(url: string): string {
  const id = getYouTubeVideoId(url)
  if (!id) return url
  return `https://www.youtube.com/watch?v=${id}`
}

// ─── Proxy helpers ─────────────────────────────────────────────────────────────

async function streamProxy(url: string): Promise<Response> {
  const proxyResp = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Referer: 'https://www.youtube.com/',
    },
  })

  if (!proxyResp.ok) {
    throw new Error(`Stream fetch failed: ${proxyResp.statusText} (${proxyResp.status})`)
  }

  if (!proxyResp.body) {
    throw new Error('Stream body is empty')
  }

  const headers: Record<string, string> = {
    'Content-Type': proxyResp.headers.get('content-type') || 'video/mp4',
    'Transfer-Encoding': 'chunked',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-cache',
    ...CORS_HEADERS,
  }

  const contentLength = proxyResp.headers.get('content-length')
  if (contentLength) headers['Content-Length'] = contentLength

  return new Response(proxyResp.body, { status: 200, headers })
}

async function streamYouTubeWithYtdl(
  rawUrl: string,
  quality: 'low' | 'medium' | 'high' = 'medium'
): Promise<Response> {
  try {
    const ytdlModule = await import('@distube/ytdl-core')
    const ytdl = (ytdlModule as any).default ?? ytdlModule

    const info = await ytdl.getInfo(rawUrl)

    const maxHeight = quality === 'low' ? 360 : quality === 'high' ? 1080 : 720

    const format = ytdl.chooseFormat(info.formats, {
      quality: 'highest',
      filter: (f: any) =>
        f.hasVideo &&
        f.hasAudio &&
        (!f.height || f.height <= maxHeight) &&
        ['mp4', 'webm'].includes((f.container || '').toLowerCase()),
    })

    if (!format || !format.url) {
      throw new Error('No suitable ytdl-core format found')
    }

    const stream = ytdl(rawUrl, {
      format,
      highWaterMark: 1 << 20,
    })

    const mimeType = format.mimeType?.split(';')[0] || 'video/mp4'

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'no-cache',
        ...CORS_HEADERS,
      },
    })
  } catch (err) {
    throw new Error(`ytdl-core fallback failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}

// ─── YouTube streaming via yt-dlp ─────────────────────────────────────────────

async function streamYouTubeContent(
  rawUrl: string,
  quality: 'low' | 'medium' | 'high' = 'medium'
): Promise<Response> {
  const url = rawUrl.includes('youtu.be') ? normalizeYouTubeUrl(rawUrl) : rawUrl

  console.log('[yt-clip] Fetching video info for', url, 'quality', quality)

  const binaryPath = await ensureYtDlpBinary()

  const YTDlpWrapModule = await import('yt-dlp-wrap')
  const YTDlpWrap: any = (YTDlpWrapModule as any).default ?? (YTDlpWrapModule as any).YTDlpWrap ?? YTDlpWrapModule

  const ytDlp = new YTDlpWrap(binaryPath)

  // Get the best mp4 format with both audio+video, fall back to bestvideo+bestaudio merged
  // Use --get-url to retrieve the direct CDN URL(s)
  let directUrls: string[] = []

  const formats = [
    'bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4]/best',
    'best[ext=mp4]/best',
    'best',
  ]

  for (const fmt of formats) {
    try {
      const output = await ytDlp.execPromise([
        url,
        '-f', fmt,
        '--get-url',
        '--no-playlist',
        '--no-warnings',
      ])

      const urls = output.trim().split('\n').filter(Boolean)
      if (urls.length > 0) {
        directUrls = urls
        console.log('[yt-clip] Got', urls.length, 'direct URL(s) for format:', fmt)
        break
      }
    } catch (err) {
      console.warn('[yt-clip] Format attempt failed:', fmt, err instanceof Error ? err.message : err)
    }
  }

  if (directUrls.length > 0) {
    // If yt-dlp returns two URLs (video + audio), we can only proxy one cleanly in-browser.
    // Use the first URL – for combined formats this is the full video+audio stream.
    const streamUrl = directUrls[0]
    console.log('[yt-clip] Proxying stream URL (first of', directUrls.length, ')')
    return streamProxy(streamUrl)
  }

  console.warn('[yt-clip] yt-dlp did not produce a valid stream URL, falling back to ytdl-core')
  return streamYouTubeWithYtdl(url, quality)
}


// ─── Route handler ─────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const inputUrl = requestUrl.searchParams.get('url')

  if (!inputUrl) {
    return NextResponse.json({ error: 'Missing url query parameter' }, { status: 400, headers: CORS_HEADERS })
  }

  const platform = detectVideoPlatform(inputUrl)

  if (platform === 'direct') {
    try {
      return await streamProxy(inputUrl)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Direct proxy error'
      return NextResponse.json({ error: message }, { status: 502, headers: CORS_HEADERS })
    }
  }

  if (platform === 'youtube' || platform === 'facebook') {
    let normalizedUrl = inputUrl.trim()
    const requestedQuality = (requestUrl.searchParams.get('quality') as 'low' | 'medium' | 'high' | null) || 'medium'

    if (platform === 'youtube') {
      normalizedUrl = normalizeYouTubeUrl(normalizedUrl)

      // Remove query parameters except v
      try {
        const parsed = new URL(normalizedUrl)
        const id = parsed.searchParams.get('v')
        if (id) {
          normalizedUrl = `https://www.youtube.com/watch?v=${id}`
        }
      } catch {
        // ignore malformed URL
      }
    }

    try {
      if (platform === 'youtube') {
        return await streamYouTubeContent(normalizedUrl, requestedQuality)
      }

      // Facebook: direct proxy attempt
      return await streamProxy(normalizedUrl)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Proxy error'
      console.error('[yt-clip] Error:', message)
      return NextResponse.json({ error: message }, { status: 502, headers: CORS_HEADERS })
    }
  }

  return NextResponse.json({ error: 'Platform not supported for proxy export' }, { status: 400, headers: CORS_HEADERS })
}
