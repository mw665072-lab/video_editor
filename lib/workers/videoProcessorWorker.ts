import { processClipsDirect } from '../ffmpegUtils'
import { VideoClip } from '../types'

interface WorkerMessage {
  videoSource: Blob | string
  clips: VideoClip[]
  quality: 'fast' | 'medium' | 'slow'
}

self.addEventListener('message', async (event) => {
  const message = event.data as WorkerMessage

  try {
    const result = await processClipsDirect(message.videoSource, message.clips, message.quality, (progress, step) => {
      self.postMessage({ type: 'progress', data: { progress, step } })
    })

    self.postMessage({ type: 'result', data: { blob: result } })
  } catch (error) {
    const messageText = error instanceof Error ? error.message : 'Unknown worker error'
    self.postMessage({ type: 'error', data: { message: messageText } })
  }
})