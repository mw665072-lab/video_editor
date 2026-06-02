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
    fullTranscript?: string
    processingTimeMs: number
  }
}

export interface ClipSuggestionJobResponse {
  success: boolean
  jobId: string
  status: 'pending' | 'running' | 'done' | 'failed'
  progress: number
  step: string
  error?: string
  data?: ClipSuggestionResponse['data']
}

export interface VideoSummaryChapter {
  title: string
  startTime: number
  endTime: number
  summary: string
}

export interface VideoSummaryResponse {
  sourceUrl: string
  platform: string
  duration: number
  overview: string
  keyPoints: string[]
  chapters: VideoSummaryChapter[]
  transcript?: string
  transcriptPreview?: string
}

export interface VideoSubtitleSegment {
  id: string
  start: number
  end: number
  text: string
}

export interface VideoSubtitlesResponse {
  sourceUrl: string
  platform: string
  duration: number
  transcript: string
  segments: VideoSubtitleSegment[]
}

export interface AIProvider {
  id: 'openai' | 'gemini' | 'anthropic'
  name: string
  available: boolean
}

export interface AiThumbnailResponse {
  success: boolean
  image: {
    dataUrl: string
    mimeType: string
    model: string
  }
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
let refreshPromise: Promise<string> | null = null

const getAccessToken = () => (typeof window === 'undefined' ? null : window.localStorage.getItem(ACCESS_TOKEN_KEY))
const setAccessToken = (token: string) => {
  if (typeof window !== 'undefined') window.localStorage.setItem(ACCESS_TOKEN_KEY, token)
}
const clearAccessToken = () => {
  if (typeof window !== 'undefined') window.localStorage.removeItem(ACCESS_TOKEN_KEY)
}

const redirectToLogin = () => {
  // Login redirect is temporarily disabled for public MVP access.
  // if (typeof window !== 'undefined') {
  //   window.location.href = '/auth/login'
  // }
}

async function refreshToken() {
  if (refreshPromise) return refreshPromise

  refreshPromise = refreshTokenOnce().finally(() => {
    refreshPromise = null
  })

  return refreshPromise
}

async function refreshTokenOnce() {
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
    // Public MVP mode: do not force guests to the login page.
    return response
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

  if (response.status === 401 && token) {
    try {
      const newToken = await refreshToken()
      headers.set('Authorization', `Bearer ${newToken}`)
      const retry = await fetch(url, {
        ...init,
        headers,
        credentials: 'include',
      })
      return ensureAuthResponse(retry)
    } catch {
      clearAccessToken()
      return response
    }
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

export interface ProxyPoolStatus {
  enabled: boolean
  source: 'db' | 'env' | 'both'
  totalProxies: number
  activeProxies: number
  usableProxies: number
  statusCounts: Record<'untested' | 'healthy' | 'cooldown' | 'quarantined' | 'disabled' | 'dead', number>
  maxUsesPerHour: number
  validator: {
    enabled: boolean
    intervalMs: number
    batchSize: number
    validationDelayMs: number
    testUrl: string
    healthTtlMs: number
    quarantineMs: number
    running: boolean
  }
  costPerGb: number
  totalDownloads: number
  totalErrors: number
  totalBotBlockErrors: number
  totalProxyAuthErrors: number
  totalBytes: number
  totalGb: number
  estimatedCost: number
  providerQuality: Array<{
    provider: string
    totalProxies: number
    activeProxies: number
    usableProxies: number
    attempts: number
    successes: number
    errors: number
    botBlockErrors: number
    proxyAuthErrors: number
    networkErrors: number
    downloads: number
    bytes: number
    gb: number
    estimatedCost: number
    successRate: number
    botBlockRate: number
    proxyAuthRate: number
    gbPerSuccessfulImport: number
  }>
  proxies: Array<{
    id: string
    label: string
    provider: string
    country: string
    status: 'untested' | 'healthy' | 'cooldown' | 'quarantined' | 'disabled' | 'dead'
    active: boolean
    healthy: boolean
    disabledUntil: string | null
    attempts: number
    successes: number
    errors: number
    botBlockErrors: number
    proxyAuthErrors: number
    networkErrors: number
    downloads: number
    bytes: number
    gb: number
    estimatedCost: number
    consecutiveFailures: number
    validationAttempts: number
    hourlyUses: number
    maxUsesPerHour: number
    validatedAt?: string | null
    lastValidationAt?: string | null
    hourWindowStartedAt?: string | null
    lastUsedAt?: string
    lastSuccessAt?: string
    lastErrorAt?: string
    lastError?: string
  }>
}

export async function getAdminProxyStatus() {
  const response = await requestWithAuth('/api/admin/proxies/status', { method: 'GET' })
  return parseApiResponse<{ proxyPool: ProxyPoolStatus }>(response)
}

export async function importAdminProxies(payload: {
  proxies: string
  provider?: string
  country?: string
  costPerGb?: number
  replaceProvider?: boolean
}) {
  const response = await requestWithAuth('/api/admin/proxies/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseApiResponse<{ result: { imported: number; skipped: number }; proxyPool: ProxyPoolStatus }>(response)
}

export async function validateAdminProxies(payload: { limit?: number; proxyId?: string } = {}) {
  const response = await requestWithAuth('/api/admin/proxies/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseApiResponse<{
    result: {
      validated: number
      healthy: number
      results: Array<{ id: string; proxy: string; ok: boolean; status: ProxyPoolStatus['proxies'][number]['status']; error?: string }>
    }
    proxyPool: ProxyPoolStatus
  }>(response)
}

export async function updateAdminProxy(id: string, payload: { isActive?: boolean; status?: ProxyPoolStatus['proxies'][number]['status'] }) {
  const response = await requestWithAuth(`/api/admin/proxies/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseApiResponse<{ proxyPool: ProxyPoolStatus }>(response)
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
  const response = await requestWithAuth('/api/suggest-clips/jobs', {
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
  
  const started = await response.json() as ClipSuggestionJobResponse
  if (!started.jobId) {
    throw new Error('Clip suggestion job did not return a job id')
  }

  return waitForClipSuggestionJob(started.jobId)
}

async function waitForClipSuggestionJob(jobId: string): Promise<ClipSuggestionResponse> {
  const startedAt = Date.now()
  const timeoutMs = 1000 * 60 * 20
  let delayMs = 1500

  while (Date.now() - startedAt < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, delayMs))

    const response = await requestWithAuth(`/api/suggest-clips/jobs/${encodeURIComponent(jobId)}`, {
      method: 'GET',
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`Clip suggestion status failed: ${response.status} ${response.statusText} ${text}`)
    }

    const job = await response.json() as ClipSuggestionJobResponse
    if (job.status === 'done' && job.data) {
      return {
        success: true,
        data: job.data,
      }
    }

    if (job.status === 'failed') {
      throw new Error(job.error || 'Clip suggestion failed')
    }

    delayMs = Math.min(5000, delayMs + 500)
  }

  throw new Error('Clip suggestion is taking longer than expected. Please try again in a few minutes.')
}

function cleanSummaryText(value: string | undefined, fallback: string) {
  const text = (value || '').replace(/\s+/g, ' ').trim()
  return text.length > 0 ? text : fallback
}

function sentencePreview(text: string, maxLength = 420) {
  const cleaned = cleanSummaryText(text, '')
  if (cleaned.length <= maxLength) return cleaned
  const clipped = cleaned.slice(0, maxLength)
  const lastStop = Math.max(clipped.lastIndexOf('. '), clipped.lastIndexOf('? '), clipped.lastIndexOf('! '))
  return `${(lastStop > 120 ? clipped.slice(0, lastStop + 1) : clipped).trim()}...`
}

function formatChapterTitle(index: number, reason: string | undefined) {
  const cleaned = cleanSummaryText(reason, '')
  if (!cleaned) return `Key moment ${index + 1}`
  const firstSentence = cleaned.split(/[.!?]/)[0]?.trim()
  return firstSentence ? firstSentence.slice(0, 72) : `Key moment ${index + 1}`
}

export async function generateVideoSummary(url: string): Promise<VideoSummaryResponse> {
  const response = await suggestClips(url, 'anthropic')
  return buildVideoSummary(response)
}

export async function generateUploadedVideoSummary(file: Blob, fileName?: string): Promise<VideoSummaryResponse> {
  const response = await requestWithAuth('/api/video-summary-upload', {
    method: 'POST',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
      'X-File-Name': encodeURIComponent(fileName || 'uploaded-video.mp4'),
      'X-AI-Provider': 'anthropic',
    },
    body: file,
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let errorMessage = `Video summary failed: ${response.status} ${response.statusText}`

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

  return buildVideoSummary(await response.json())
}

function buildVideoSubtitles(response: {
  data: {
    url: string
    videoDuration: number
    platform: string
    fullTranscript?: string
    segments?: Array<{ start: number; end: number; text: string }>
  }
}): VideoSubtitlesResponse {
  const segments = (response.data.segments || []).map((segment, index) => ({
    id: `${Math.round(segment.start * 1000)}-${index}`,
    start: segment.start,
    end: segment.end,
    text: segment.text,
  }))

  return {
    sourceUrl: response.data.url,
    platform: response.data.platform,
    duration: response.data.videoDuration,
    transcript: response.data.fullTranscript || segments.map((segment) => segment.text).join(' '),
    segments,
  }
}

export async function generateVideoSubtitles(url: string): Promise<VideoSubtitlesResponse> {
  const response = await requestWithAuth('/api/video-subtitles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, aiProvider: 'anthropic' }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let errorMessage = `Subtitle generation failed: ${response.status} ${response.statusText}`

    try {
      const errorData = JSON.parse(text)
      if (errorData.message) errorMessage = errorData.message
    } catch {
      // Keep default error message
    }

    throw new Error(errorMessage)
  }

  return buildVideoSubtitles(await response.json())
}

export async function generateUploadedVideoSubtitles(file: Blob, fileName?: string): Promise<VideoSubtitlesResponse> {
  const response = await requestWithAuth('/api/video-subtitles-upload', {
    method: 'POST',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
      'X-File-Name': encodeURIComponent(fileName || 'uploaded-video.mp4'),
      'X-AI-Provider': 'anthropic',
    },
    body: file,
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let errorMessage = `Subtitle generation failed: ${response.status} ${response.statusText}`

    try {
      const errorData = JSON.parse(text)
      if (errorData.message) errorMessage = errorData.message
    } catch {
      // Keep default error message
    }

    throw new Error(errorMessage)
  }

  return buildVideoSubtitles(await response.json())
}

function buildVideoSummary(response: ClipSuggestionResponse): VideoSummaryResponse {
  const { data } = response
  const suggestions = [...data.suggestions].sort((a, b) => a.startTime - b.startTime)
  const transcript = cleanSummaryText(data.fullTranscript, '')
  const transcriptPreview = sentencePreview(transcript, 700)
  const bestMoments = suggestions
    .slice(0, 4)
    .map((clip, index) => cleanSummaryText(clip.reason, `Important moment ${index + 1}`))

  const overviewFromTranscript = transcriptPreview
  const overviewFromClips = bestMoments.length
    ? `This video centers on ${bestMoments.map((point) => point.toLowerCase()).join(', ')}.`
    : ''

  return {
    sourceUrl: data.url,
    platform: data.platform,
    duration: data.videoDuration,
    overview: overviewFromTranscript || overviewFromClips || 'Summary generated from the detected video moments.',
    keyPoints: bestMoments.length
      ? bestMoments
      : suggestions.map((clip) => cleanSummaryText(clip.transcriptSegment, 'Relevant video segment')).slice(0, 4),
    chapters: suggestions.map((clip, index) => ({
      title: formatChapterTitle(index, clip.reason),
      startTime: clip.startTime,
      endTime: clip.endTime,
      summary: cleanSummaryText(clip.transcriptSegment, clip.reason || `Highlighted section ${index + 1}`),
    })),
    transcript: transcript || undefined,
    transcriptPreview: transcriptPreview || undefined,
  }
}

export async function getAIProviders(): Promise<{ providers: AIProvider[]; default: string }> {
  const response = await requestWithAuth('/api/ai-providers', { method: 'GET' })
  
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Failed to get AI providers: ${response.status} ${response.statusText} ${text}`)
  }
  
  return response.json()
}

export async function generateAiThumbnail(prompt: string): Promise<AiThumbnailResponse> {
  const response = await requestWithAuth('/api/ai-thumbnail', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let errorMessage = `AI thumbnail failed: ${response.status} ${response.statusText}`

    try {
      const errorData = JSON.parse(text)
      if (errorData.message) errorMessage = errorData.message
    } catch {
      // Keep default error message
    }

    throw new Error(errorMessage)
  }

  return response.json()
}

/**
 * DELETE /api/hls-clean
 * Triggers backend to remove any stale HLS jobs for the current user.
 */
export async function hlsCleanup(): Promise<{ success: boolean; cleanedCount: number }> {
  try {
    if (!getAccessToken()) return { success: false, cleanedCount: 0 }
    const response = await requestWithAuth('/api/hls-clean', { method: 'DELETE' })
    if (!response.ok) return { success: false, cleanedCount: 0 }
    return response.json()
  } catch {
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
    if (!getAccessToken()) return { success: false }
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
  importId?: string
  streamUrl: string
  duration: number
  title: string
  storageProvider?: 'local' | 'cloudinary'
  importProvider?: 'managed' | 'yt-dlp'
  expiresAt?: string
}> {
  const response = await requestWithAuth(`/api/yt-resolve?url=${encodeURIComponent(url)}`, { method: 'GET' })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error((err as any).error || `Failed to resolve URL (${response.status})`)
  }
  return response.json()
}
