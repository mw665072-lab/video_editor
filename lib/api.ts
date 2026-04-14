const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '')

export interface ClipPayload {
  url: string
  startTime: number
  endTime: number
}

export interface SuggestedClip {
  startTime: number
  endTime: number
  duration: number
  confidence: number
  reason: string
  transcriptSegment?: string
}

export interface ClipSuggestionResponse {
  success: boolean
  data: {
    url: string
    videoDuration: number
    platform: string
    suggestions: SuggestedClip[]
    processingTimeMs: number
  }
}

export interface AIProvider {
  id: 'openai' | 'gemini' | 'anthropic'
  name: string
  available: boolean
}

export async function clipVideo(payload: ClipPayload): Promise<Blob> {
  const response = await requestWithAuth('/api/clip-video', {
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

export interface ExportVideoRequest {
  videoSource: string
  originalSource?: string
  clips?: Array<{ startTime: number; endTime: number; order?: number }>
  startTime?: number
  duration?: number
  platform?: 'tiktok' | 'shorts' | 'reels'
  resizeMode?: 'blur' | 'crop'
}

export async function exportVideo(options: ExportVideoRequest): Promise<{ jobId: string }> {
  const response = await requestWithAuth('/api/export-video', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
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
  downloadUrls?: string[]
}> {
  const response = await requestWithAuth(`/api/export-video?jobId=${encodeURIComponent(jobId)}`, {
    method: 'GET',
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Export status request failed: ${response.status} ${response.statusText} ${text}`)
  }

  return response.json()
}

export async function downloadExportedVideo(downloadUrl: string): Promise<Blob> {
  const normalizedUrl = downloadUrl.startsWith('/') ? downloadUrl : downloadUrl
  const response = await requestWithAuth(normalizedUrl, { method: 'GET' })
  if (!response.ok) {
    const text = await response.text().catch(() => '')

    let friendlyError = text || `${response.status} ${response.statusText}`
    try {
      const parsed = JSON.parse(text)
      if (parsed && typeof parsed === 'object' && 'error' in parsed) {
        const errorText = String((parsed as any).error)
        if (/download limit reached/i.test(errorText)) {
          friendlyError = 'Download limit reached for your plan. Please upgrade to continue exporting videos.'
        } else {
          friendlyError = errorText
        }
      }
    } catch {
      // Not JSON, keep raw text
    }

    if (response.status === 403 && /download limit reached/i.test(friendlyError)) {
      throw new Error('Download limit reached for your plan. Please upgrade to continue exporting videos.')
    }

    throw new Error(`Download request failed: ${response.status} ${response.statusText} ${friendlyError}`)
  }

  return response.blob()
}

export async function recordDownload(): Promise<void> {
  const response = await requestWithAuth('/api/download-clip', { method: 'POST' })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Record download failed: ${response.status} ${response.statusText} ${text}`)
  }
}

// Visual Export API functions
export interface VisualExportRequest {
  videoSource: string
  originalSource?: string
  filters?: {
    brightness: number
    contrast: number
    saturation: number
  }
  audio?: {
    volume: number
    muted: boolean
  }
  captions?: Array<{
    text: string
    start: number
    end: number
    position: 'top' | 'center' | 'bottom'
  }>
}

export async function exportVisualVideo(options: VisualExportRequest): Promise<{ jobId: string }> {
  const response = await requestWithAuth('/api/visual-export', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Visual export request failed: ${response.status} ${response.statusText} ${text}`)
  }

  return response.json()
}

export async function getVisualExportStatus(jobId: string): Promise<{
  status: 'pending' | 'running' | 'done' | 'failed'
  progress: number
  step?: string
  error?: string
  downloadUrl?: string
}> {
  const response = await requestWithAuth(`/api/visual-export?jobId=${encodeURIComponent(jobId)}`, {
    method: 'GET',
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Visual export status request failed: ${response.status} ${response.statusText} ${text}`)
  }

  return response.json()
}

export async function downloadVisualExportedVideo(downloadUrl: string): Promise<Blob> {
  const normalizedUrl = downloadUrl.startsWith('/') ? downloadUrl : downloadUrl
  const response = await requestWithAuth(normalizedUrl, { method: 'GET' })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Visual export download failed: ${response.status} ${response.statusText} ${text}`)
  }

  return response.blob()
}

export async function health(): Promise<{ status: string }> {
  const response = await requestWithAuth('/api/health', { method: 'GET' })
  if (!response.ok) {
    throw new Error('Health check failed')
  }
  return response.json()
}

const ACCESS_TOKEN_KEY = 'clipai_access_token'

const getAccessToken = () => (typeof window === 'undefined' ? null : window.localStorage.getItem(ACCESS_TOKEN_KEY))
const setAccessToken = (token: string) => {
  if (typeof window !== 'undefined') window.localStorage.setItem(ACCESS_TOKEN_KEY, token)
}
const clearAccessToken = () => {
  if (typeof window !== 'undefined') window.localStorage.removeItem(ACCESS_TOKEN_KEY)
}

const redirectToLogin = () => {
  if (typeof window !== 'undefined') {
    window.location.href = '/auth/login'
  }
}

async function refreshToken() {
  const response = await fetch(`${BASE_URL}/api/auth/refresh-token`, {
    method: 'POST',
    credentials: 'include',
  })
  if (!response.ok) {
    clearAccessToken()
    redirectToLogin()
    throw new Error('Unable to refresh session')
  }

  const data = await response.json()
  if (!data.accessToken) {
    clearAccessToken()
    redirectToLogin()
    throw new Error('No access token received')
  }
  setAccessToken(data.accessToken)
  return data.accessToken
}

const ensureAuthResponse = (response: Response): Response => {
  if (response.status === 401) {
    clearAccessToken()
    redirectToLogin()
    throw new Error('Unauthorized. Redirecting to login.')
  }
  return response
}

export async function requestWithAuth(input: RequestInfo, init: RequestInit = {}) {
  const token = getAccessToken()
  const headers = new Headers(init.headers instanceof Headers ? init.headers : init.headers || {})

  if (token) headers.set('Authorization', `Bearer ${token}`)

  const url =
    typeof input === 'string'
      ? (/^https?:\/\//i.test(input) ? input : `${BASE_URL}${input}`)
      : input
  const response = await fetch(url, {
    ...init,
    headers,
    credentials: 'include',
  })

  if (response.status === 401) {
    const newToken = await refreshToken()
    headers.set('Authorization', `Bearer ${newToken}`)
    const retry = await fetch(url, {
      ...init,
      headers,
      credentials: 'include',
    })
    return ensureAuthResponse(retry)
  }

  return ensureAuthResponse(response)
}

export async function register(name: string, email: string, password: string) {
  const response = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
    credentials: 'include',
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Register failed: ${response.status} ${response.statusText} ${text}`)
  }
  const data = await response.json()
  setAccessToken(data.tokens.accessToken)
  return data
}

export async function login(email: string, password: string) {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Login failed: ${response.status} ${response.statusText} ${text}`)
  }
  const data = await response.json()
  setAccessToken(data.tokens.accessToken)
  return data
}

export async function logout() {
  await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  })
  clearAccessToken()
  if (typeof window !== 'undefined') {
    window.location.href = '/'
  }
}

export async function getProfile() {
  const response = await requestWithAuth('/api/auth/me', { method: 'GET' })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Profile request failed: ${response.status} ${response.statusText} ${text}`)
  }
  return response.json()
}

export async function forgotPassword(email: string) {
  const response = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Forgot password failed: ${response.status} ${response.statusText} ${text}`)
  }
  return response.json()
}

export async function resetPassword(token: string, newPassword: string) {
  const response = await fetch(`${BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Reset password failed: ${response.status} ${response.statusText} ${text}`)
  }
  return response.json()
}

export async function verifyEmail(token: string) {
  const response = await fetch(`${BASE_URL}/api/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Email verification failed: ${response.status} ${response.statusText} ${text}`)
  }
  return response.json()
}

export async function createSubscriptionCheckout(priceId: string) {
  const response = await requestWithAuth('/api/subscription/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId }),
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Checkout session failed: ${response.status} ${response.statusText} ${text}`)
  }
  return response.json()
}

export async function suggestClips(
  url: string,
  aiProvider: 'openai' | 'gemini' | 'anthropic' | 'auto' = 'auto'
): Promise<ClipSuggestionResponse> {
  const response = await requestWithAuth('/api/suggest-clips', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, aiProvider }),
  })
  
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let errorMessage = `Clip suggestion failed: ${response.status} ${response.statusText}`
    
    try {
      const errorData = JSON.parse(text)
      if (errorData.message) {
        errorMessage = errorData.message
      }
    } catch {
      // Use default error message
    }
    
    throw new Error(errorMessage)
  }
  
  return response.json()
}

export async function getAIProviders(): Promise<{ providers: AIProvider[]; default: string }> {
  const response = await requestWithAuth('/api/ai-providers', { method: 'GET' })
  
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Failed to get AI providers: ${response.status} ${response.statusText} ${text}`)
  }
  
  return response.json()
}

/**
 * DELETE /api/hls-clean
 * Triggers backend to remove any stale HLS jobs for the current user.
 */
export async function hlsCleanup(): Promise<{ success: boolean; cleanedCount: number }> {
  try {
    const response = await requestWithAuth('/api/hls-clean', { method: 'DELETE' })
    if (!response.ok) return { success: false, cleanedCount: 0 }
    return response.json()
  } catch (err) {
    console.error('[api] hls-clean failed:', err)
    return { success: false, cleanedCount: 0 }
  }
}

/**
 * POST /api/hls-heartbeat
 * Keeps the user's HLS session alive while the editor is open.
 * Call periodically (e.g. every 2 minutes) to prevent inactivity cleanup.
 */
export async function hlsHeartbeat(): Promise<{ success: boolean }> {
  try {
    const response = await requestWithAuth('/api/hls-heartbeat', { method: 'POST' })
    if (!response.ok) return { success: false }
    return response.json()
  } catch {
    return { success: false }
  }
}

export async function hlsPrepare(url: string, platform: string): Promise<{
  jobId: string
  hlsUrl: string
  duration: number
  title: string
}> {
  const response = await requestWithAuth(
    `/api/hls-prepare?url=${encodeURIComponent(url)}&platform=${encodeURIComponent(platform)}`,
    {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    }
  )
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error((err as any).error || `Failed to prepare HLS stream (${response.status})`)
  }
  return response.json()
}

export async function hlsStatus(jobId: string): Promise<{
  status: 'pending' | 'ready' | 'error'
  playlistReady: boolean
  errorMessage?: string
}> {
  const response = await requestWithAuth(`/api/hls-status/${jobId}`, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
  })
  if (!response.ok) {
    throw new Error(`Failed to get HLS status (${response.status})`)
  }
  return response.json()
}

export async function ytResolve(url: string): Promise<{
  streamUrl: string
  duration: number
  title: string
}> {
  const response = await requestWithAuth(`/api/yt-resolve?url=${encodeURIComponent(url)}`, { method: 'GET' })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error((err as any).error || `Failed to resolve URL (${response.status})`)
  }
  return response.json()
}
