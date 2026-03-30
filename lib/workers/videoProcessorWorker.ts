// This worker is removed from service; frontend should no longer use local FFmpeg worker.
// Keep a stub in case of old references.

self.addEventListener('message', () => {
  self.postMessage({ type: 'error', data: { message: 'videoProcessorWorker is deprecated; use backend API' } })
})