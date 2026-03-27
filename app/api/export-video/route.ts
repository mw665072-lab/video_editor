import { NextResponse } from 'next/server'
import path from 'path'
import os from 'os'
import fs from 'fs'
import fsPromises from 'fs/promises'
import { spawn } from 'child_process'
import { Readable } from 'stream'
import crypto from 'crypto'

export const runtime = 'nodejs'

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'false',
  'Vary': 'Origin',
}

function jsonCors(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: CORS_HEADERS })
}

function createCorsResponse(body: BodyInit | null, status = 200, headers?: HeadersInit) {
  const mergedHeaders = { ...CORS_HEADERS, ...(headers || {}) }
  return new NextResponse(body, { status, headers: mergedHeaders })
}

interface ExportJob {
  status: 'pending' | 'running' | 'done' | 'failed'
  progress: number
  step: string
  error?: string
  outputPath?: string
  expiresAt: number
}

const exportJobs = new Map<string, ExportJob>()
const JOB_TTL_MS = 1000 * 60 * 15
const MAX_PARALLEL_DOWNLOADS = 3

function getYtDlpBinaryPath(): string {
  const ytDlpWrapDir = path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin')
  const binaryName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
  return path.join(ytDlpWrapDir, binaryName)
}

function getFfmpegBinaryPath(): string {
  try {
    // @ts-ignore dynamic optional dependency
    const ffmpegStatic = require('ffmpeg-static')
    if (ffmpegStatic && fs.existsSync(ffmpegStatic)) {
      return ffmpegStatic
    }
  } catch {
    // ignore if package not installed
  }
  return 'ffmpeg'
}

async function ensureYtDlpBinary(): Promise<string> {
  const binaryPath = getYtDlpBinaryPath()
  if (fs.existsSync(binaryPath)) return binaryPath

  const YTDlpWrapModule = await import('yt-dlp-wrap')
  const YTDlpWrap: any = (YTDlpWrapModule as any).default ?? (YTDlpWrapModule as any).YTDlpWrap ?? YTDlpWrapModule

  fs.mkdirSync(path.dirname(binaryPath), { recursive: true })
  await YTDlpWrap.downloadFromGithub(binaryPath)
  return binaryPath
}

function runCommand(
  command: string,
  args: string[],
  onStdErr?: (line: string) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] })

    proc.stderr.setEncoding('utf8')
    proc.stderr.on('data', data => {
      const text = data.toString()
      if (onStdErr) onStdErr(text)
    })

    proc.on('error', err => reject(err))
    proc.on('close', code => {
      if (code === 0) resolve()
      else reject(new Error(`${path.basename(command)} exited with code ${code}`))
    })
  })
}

function cleanupExpiredJobs() {
  const now = Date.now()
  for (const [jobId, job] of exportJobs.entries()) {
    if (job.expiresAt <= now) {
      if (job.outputPath && fs.existsSync(job.outputPath)) {
        fs.unlinkSync(job.outputPath)
      }
      exportJobs.delete(jobId)
    }
  }
}

function parseNumberParam(input: string | null): number | null {
  if (!input) return null
  const n = Number(input)
  return Number.isFinite(n) ? n : null
}

async function downloadClipSegment(
  srcUrl: string,
  clipIdx: number,
  startTime: number,
  endTime: number,
  jobId: string,
  job: ExportJob
): Promise<string> {
  const binaryPath = await ensureYtDlpBinary()
  const tmpDir = os.tmpdir()
  const outPath = path.join(tmpDir, `export-${jobId}-clip-${clipIdx}.mp4`)

  const format = 'bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4]/best'
  const args = [
    srcUrl,
    '-f',
    format,
    '--no-playlist',
    '--no-warnings',
    '--no-check-certificate',
    '--download-sections',
    `*${startTime}-${endTime}`,
    '--output',
    outPath,
    '--quiet',
  ]

  await runCommand(binaryPath, args, text => {
    if (text.includes('Downloading') || text.includes('Merging formats')) {
      job.step = `downloading clip ${clipIdx + 1}`
    }
  })

  const exists = fs.existsSync(outPath)
  if (!exists) throw new Error(`Failed to download segment ${clipIdx + 1}`)

  return outPath
}

async function concatSegments(segments: string[], outputPath: string, job: ExportJob, totalDuration: number): Promise<void> {
  const concatListPath = `${outputPath}.txt`
  const concatFileContent = segments.map(segment => `file '${segment.replace(/'/g, "'\\''")}'`).join('\n')
  await fsPromises.writeFile(concatListPath, concatFileContent, 'utf-8')

  const ffmpegPath = getFfmpegBinaryPath()
  const ffmpegArgsCopy = ['-f', 'concat', '-safe', '0', '-i', concatListPath, '-c', 'copy', '-movflags', '+faststart', '-y', outputPath]

  try {
    await runCommand(ffmpegPath, ffmpegArgsCopy, text => {
      const matches = text.match(/time=([0-9:.]+)/)
      if (matches) {
        const tParts = matches[1].split(':').map(parseFloat)
        const seconds = (tParts[0] || 0) * 3600 + (tParts[1] || 0) * 60 + (tParts[2] || 0)
        job.progress = Math.min(95, 40 + Math.round((seconds / totalDuration) * 45))
        job.step = 'merging clips'
      }
    })
  } catch (err) {
    // fallback to full re-encode
    const ffmpegPath = getFfmpegBinaryPath()
    const ffmpegArgsReencode = [
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      concatListPath,
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '23',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      '-y',
      outputPath,
    ]

    await runCommand(ffmpegPath, ffmpegArgsReencode, text => {
      const matches = text.match(/time=([0-9:.]+)/)
      if (matches) {
        const tParts = matches[1].split(':').map(parseFloat)
        const seconds = (tParts[0] || 0) * 3600 + (tParts[1] || 0) * 60 + (tParts[2] || 0)
        job.progress = Math.min(98, 40 + Math.round((seconds / totalDuration) * 55))
        job.step = 're-encoding clips'
      }
    })
  } finally {
    await fsPromises.unlink(concatListPath).catch(() => null)
  }
}

async function processExportJob(jobId: string, videoSource: string, clips: any[], quality: string) {
  const job = exportJobs.get(jobId)
  if (!job) return

  try {
    job.status = 'running'
    job.step = 'preparing'
    job.progress = 5

    const normalizedClips = clips
      .map((clip: any, idx: number) => ({
        startTime: Number(clip.startTime),
        endTime: Number(clip.endTime),
        order: Number(clip.order ?? idx),
      }))
      .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))

    if (normalizedClips.length === 0) {
      throw new Error('No clips provided')
    }

    const totalClipDuration = normalizedClips.reduce((sum: number, clip: any) => sum + Math.max(0, clip.endTime - clip.startTime), 0)
    if (totalClipDuration <= 0) {
      throw new Error('Clip durations must be positive')
    }

    const segmentPaths: string[] = []
    let nextIndex = 0

    async function worker() {
      while (nextIndex < normalizedClips.length) {
        const idx = nextIndex
        nextIndex += 1

        const clip = normalizedClips[idx]
        if (!clip) break

        const jobRef = job
        if (!jobRef) return

        const segmentPath = await downloadClipSegment(videoSource, idx, clip.startTime, clip.endTime, jobId, jobRef)
        segmentPaths[idx] = segmentPath

        const finished = segmentPaths.filter(Boolean).length
        jobRef.progress = Math.min(40, 5 + Math.round((finished / normalizedClips.length) * 35))
        jobRef.step = `fetching segments (${finished}/${normalizedClips.length})`
      }
    }

    const workers = Array.from({ length: Math.min(MAX_PARALLEL_DOWNLOADS, normalizedClips.length) }, worker)
    await Promise.all(workers)

    job.step = 'concatenating segments'
    job.progress = 45

    const outputPath = path.join(os.tmpdir(), `export-${jobId}.mp4`)
    await concatSegments(segmentPaths, outputPath, job, totalClipDuration)

    job.step = 'finalizing'
    job.progress = 100
    job.status = 'done'
    job.outputPath = outputPath
    job.expiresAt = Date.now() + JOB_TTL_MS

    // cleanup segment artifacts
    for (const segment of segmentPaths) {
      if (segment && fs.existsSync(segment)) await fsPromises.unlink(segment).catch(() => null)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    job.status = 'failed'
    job.error = message
    job.step = 'failed'
    job.progress = 0

    // cleanup temporary files if there are any
    if (job.outputPath && fs.existsSync(job.outputPath)) {
      await fsPromises.unlink(job.outputPath).catch(() => null)
    }
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET(request: Request) {
  cleanupExpiredJobs()

  const url = new URL(request.url)
  const jobId = url.searchParams.get('jobId')
  const action = url.searchParams.get('action') || 'status'

  if (!jobId) {
    return jsonCors({ error: 'Missing jobId' }, 400)
  }

  const job = exportJobs.get(jobId)
  if (!job) {
    return jsonCors({ error: 'Job not found or expired' }, 404)
  }

  if (action === 'download') {
    if (job.status !== 'done' || !job.outputPath) {
      return jsonCors({ error: 'Job is not ready for download' }, 409)
    }

    const fileStream = fs.createReadStream(job.outputPath)
    const headers = new Headers({
      'Content-Type': 'video/mp4',
      'Content-Disposition': `attachment; filename="export-${jobId}.mp4"`,
      ...CORS_HEADERS,
    })
    headers.set('Vary', 'Origin')
    return new NextResponse(Readable.toWeb(fileStream) as any, { status: 200, headers })
  }

  return jsonCors({
    status: job.status,
    progress: job.progress,
    step: job.step,
    error: job.error,
    downloadUrl: job.status === 'done' ? `/api/export-video?jobId=${jobId}&action=download` : undefined,
  })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body) {
    return jsonCors({ error: 'Invalid JSON body' }, 400)
  }

  const videoSource = String(body.videoSource || '')
  const clips = Array.isArray(body.clips) ? body.clips : []
  const quality = String(body.quality || 'medium')

  if (!videoSource) {
    return jsonCors({ error: 'Missing videoSource' }, 400)
  }

  if (clips.length === 0) {
    return jsonCors({ error: 'Missing clips array' }, 400)
  }

  const jobId = crypto.randomUUID()
  const now = Date.now()

  exportJobs.set(jobId, {
    status: 'pending',
    progress: 0,
    step: 'queued',
    expiresAt: now + JOB_TTL_MS,
  })

  processExportJob(jobId, videoSource, clips, quality).catch(err => {
    const job = exportJobs.get(jobId)
    if (job) {
      job.status = 'failed'
      job.error = err instanceof Error ? err.message : String(err)
      job.step = 'failed'
      job.progress = 0
    }
  })

  return jsonCors({ jobId })
}
