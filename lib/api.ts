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

export interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  contentHtml: string
  coverImageUrl: string
  category: string
  tags: string[]
  status: 'draft' | 'published' | 'archived'
  authorName: string
  likeCount: number
  dislikeCount: number
  commentCount: number
  userReaction: 'like' | 'dislike' | null
  comments: Array<{ id: string; userName: string; body: string; createdAt: string }>
  publishedAt?: string
  createdAt: string
  updatedAt: string
}

export interface BlogPayload {
  title: string
  slug?: string
  excerpt: string
  contentHtml: string
  coverImageUrl?: string
  coverImagePublicId?: string
  category: string
  tags: string[]
  status: 'draft' | 'published' | 'archived'
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(text || `Request failed with ${response.status}`)
  }
  return response.json()
}

export async function listBlogs(params: { category?: string; search?: string; page?: number; limit?: number } = {}) {
  const query = new URLSearchParams()
  if (params.category) query.set('category', params.category)
  if (params.search) query.set('search', params.search)
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  const response = await fetch(`${BASE_URL}/api/blogs?${query.toString()}`, { cache: 'no-store' })
  return parseApiResponse<{ posts: BlogPost[]; total: number; page: number; pages: number }>(response)
}

export async function listBlogCategories() {
  const response = await fetch(`${BASE_URL}/api/blogs/categories`, { cache: 'no-store' })
  return parseApiResponse<{ categories: string[] }>(response)
}

export async function getBlog(slug: string) {
  const response = await requestWithAuth(`/api/blogs/${encodeURIComponent(slug)}`, { method: 'GET' })
  return parseApiResponse<{ post: BlogPost }>(response)
}

export async function reactToBlog(id: string, reaction: 'like' | 'dislike' | 'none') {
  const response = await requestWithAuth(`/api/blogs/${encodeURIComponent(id)}/reaction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reaction }),
  })
  return parseApiResponse<{ post: BlogPost }>(response)
}

export async function addBlogComment(id: string, body: string) {
  const response = await requestWithAuth(`/api/blogs/${encodeURIComponent(id)}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  })
  return parseApiResponse<{ post: BlogPost }>(response)
}

export async function listAdminBlogs() {
  const response = await requestWithAuth('/api/admin/blogs', { method: 'GET' })
  return parseApiResponse<{ posts: BlogPost[] }>(response)
}

export async function createAdminBlog(payload: BlogPayload) {
  const response = await requestWithAuth('/api/admin/blogs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseApiResponse<{ post: BlogPost }>(response)
}

export async function updateAdminBlog(id: string, payload: BlogPayload) {
  const response = await requestWithAuth(`/api/admin/blogs/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseApiResponse<{ post: BlogPost }>(response)
}

export async function deleteAdminBlog(id: string) {
  const response = await requestWithAuth(`/api/admin/blogs/${encodeURIComponent(id)}`, { method: 'DELETE' })
  return parseApiResponse<{ success: boolean }>(response)
}

export async function uploadBlogImage(dataUrl: string) {
  const response = await requestWithAuth('/api/admin/blogs/upload-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataUrl }),
  })
  return parseApiResponse<{ image: { secureUrl: string; publicId: string; width?: number; height?: number } }>(response)
}

export interface AdminStats {
  totalUsers: number
  adminUsers: number
  totalExports: number
  clipsThisMonth: number
  downloadsThisMonth: number
  comments: number
  likes: number
  dislikes: number
  planBreakdown: Record<string, number>
  exportsByStatus: Record<string, number>
  blogStatus: Record<string, number>
  recentUsers: Array<{ id: string; name: string; email: string; role: string; subscriptionPlan: string; createdAt: string }>
  recentBlogs: Array<{ id: string; title: string; slug: string; status: string; category: string; updatedAt: string }>
}

export async function getAdminStats() {
  const response = await requestWithAuth('/api/admin/stats', { method: 'GET' })
  return parseApiResponse<{ stats: AdminStats }>(response)
}

export type CmsNavLocation = 'navbar' | 'footer' | 'sidebar_user' | 'sidebar_admin'
export type CmsAudience = 'public' | 'user' | 'admin' | 'all'
export type CmsPageStatus = 'draft' | 'published' | 'archived'

export interface CmsSettings {
  siteName: string
  logoText: string
  tagline: string
  headerTitle: string
  headerSubtitle: string
  footerDescription: string
  footerCopyright: string
  socialLinks: Array<{ label: string; href: string; icon?: string }>
}

export interface CmsNavItem {
  id: string
  label: string
  href: string
  location: CmsNavLocation
  audience: CmsAudience
  icon: string
  order: number
  isActive: boolean
  external: boolean
  createdAt?: string
  updatedAt?: string
}

export interface CmsPage {
  id: string
  title: string
  slug: string
  excerpt: string
  contentHtml: string
  status: CmsPageStatus
  metaTitle: string
  metaDescription: string
  showInNavbar: boolean
  showInFooter: boolean
  authorName: string
  publishedAt?: string
  createdAt: string
  updatedAt: string
}

export interface PublicCms {
  settings: CmsSettings
  nav: {
    navbar: CmsNavItem[]
    footer: CmsNavItem[]
    sidebarUser: CmsNavItem[]
    sidebarAdmin: CmsNavItem[]
  }
  pages: CmsPage[]
}

export interface AdminCms {
  settings: CmsSettings
  navItems: CmsNavItem[]
  pages: CmsPage[]
}

export type CmsNavPayload = Omit<CmsNavItem, 'id' | 'createdAt' | 'updatedAt'>
export type CmsPagePayload = Omit<CmsPage, 'id' | 'authorName' | 'publishedAt' | 'createdAt' | 'updatedAt'>

export async function getPublicCms() {
  const response = await fetch(`${BASE_URL}/api/cms/public`, { cache: 'no-store' })
  return parseApiResponse<PublicCms>(response)
}

export async function getCmsPage(slug: string) {
  const response = await fetch(`${BASE_URL}/api/cms/pages/${encodeURIComponent(slug)}`, { cache: 'no-store' })
  return parseApiResponse<{ page: CmsPage }>(response)
}

export async function getAdminCms() {
  const response = await requestWithAuth('/api/admin/cms', { method: 'GET' })
  return parseApiResponse<AdminCms>(response)
}

export async function updateCmsSettings(payload: CmsSettings) {
  const response = await requestWithAuth('/api/admin/cms/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseApiResponse<{ settings: CmsSettings }>(response)
}

export async function createCmsNavItem(payload: CmsNavPayload) {
  const response = await requestWithAuth('/api/admin/cms/nav', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseApiResponse<{ item: CmsNavItem }>(response)
}

export async function updateCmsNavItem(id: string, payload: CmsNavPayload) {
  const response = await requestWithAuth(`/api/admin/cms/nav/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseApiResponse<{ item: CmsNavItem }>(response)
}

export async function deleteCmsNavItem(id: string) {
  const response = await requestWithAuth(`/api/admin/cms/nav/${encodeURIComponent(id)}`, { method: 'DELETE' })
  return parseApiResponse<{ success: boolean }>(response)
}

export async function createCmsPage(payload: CmsPagePayload) {
  const response = await requestWithAuth('/api/admin/cms/pages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseApiResponse<{ page: CmsPage }>(response)
}

export async function updateCmsPage(id: string, payload: CmsPagePayload) {
  const response = await requestWithAuth(`/api/admin/cms/pages/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseApiResponse<{ page: CmsPage }>(response)
}

export async function deleteCmsPage(id: string) {
  const response = await requestWithAuth(`/api/admin/cms/pages/${encodeURIComponent(id)}`, { method: 'DELETE' })
  return parseApiResponse<{ success: boolean }>(response)
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
