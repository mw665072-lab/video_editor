const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '')

export interface ClipPayload {
  url: string
  startTime: number
  endTime: number
}

export async function clipVideo(payload: ClipPayload): Promise<Blob> {
  const response = await fetch(`${BASE_URL}/api/clip-video`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Clip video request failed: ${response.status} ${response.statusText} ${text}`)
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('video')) {
    const text = await response.text().catch(() => '')
    throw new Error(`Expected video response; got: ${text}`)
  }

  return await response.blob()
}

export async function exportVideo(
  videoSource: string,
  clips: Array<{ startTime: number; endTime: number; order?: number }>
): Promise<{ jobId: string }> {
  const response = await fetch(`${BASE_URL}/api/export-video`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ videoSource, clips }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Export video request failed: ${response.status} ${response.statusText} ${text}`)
  }

  return response.json()
}

export async function getExportStatus(jobId: string): Promise<{
  status: 'pending' | 'running' | 'done' | 'failed'
  progress: number
  step?: string
  error?: string
  downloadUrl?: string
}> {
  const response = await fetch(`${BASE_URL}/api/export-video?jobId=${encodeURIComponent(jobId)}`)
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Export status request failed: ${response.status} ${response.statusText} ${text}`)
  }

  return response.json()
}

export async function downloadExportedVideo(downloadUrl: string): Promise<Blob> {
  const normalizedUrl = downloadUrl.startsWith('/') ? `${BASE_URL}${downloadUrl}` : downloadUrl
  const response = await fetch(normalizedUrl)
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Download request failed: ${response.status} ${response.statusText} ${text}`)
  }

  return response.blob()
}

export async function health(): Promise<{ status: string }> {
  const response = await fetch(`${BASE_URL}/api/health`)
  if (!response.ok) {
    throw new Error('Health check failed')
  }
  return response.json()
}
