'use client'

import { useReducer, useCallback } from 'react'
import { EditorState, VideoClip } from '@/lib/types'
import { generateClipId, validateClip, sortClipsByOrder } from '@/lib/videoUtils'

type Action =
  | { type: 'SET_VIDEO'; payload: { source: Blob | string; sourceType?: 'file' | 'direct' | 'youtube' | 'facebook' | 'unknown'; duration: number; fileName?: string } }
  | { type: 'CLEAR_VIDEO' }
  | { type: 'SET_CURRENT_TIME'; payload: number }
  | { type: 'SET_VIDEO_DURATION'; payload: number }
  | { type: 'SET_PLAYING'; payload: boolean }
  | { type: 'ADD_CLIP'; payload: Omit<VideoClip, 'id' | 'order'> }
  | { type: 'REMOVE_CLIP'; payload: string }
  | { type: 'UPDATE_CLIP'; payload: VideoClip }
  | { type: 'REORDER_CLIPS'; payload: VideoClip[] }
  | { type: 'SELECT_CLIP'; payload: string | null }
  | { type: 'CLEAR_CLIPS' }

const initialState: EditorState = {
  videoSource: null,
  videoDuration: 0,
  clips: [],
  currentTime: 0,
  isPlaying: false,
  selectedClipId: null,
}

function editorReducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case 'SET_VIDEO':
      return {
        ...state,
        videoSource: action.payload.source,
        videoSourceType: action.payload.sourceType,
        videoDuration: action.payload.duration,
        videoFileName: action.payload.fileName,
      }

    case 'CLEAR_VIDEO':
      return {
        ...initialState,
      }

    case 'SET_CURRENT_TIME':
      return {
        ...state,
        currentTime: action.payload,
      }

    case 'SET_VIDEO_DURATION':
      return {
        ...state,
        videoDuration: action.payload,
      }

    case 'SET_PLAYING':
      return {
        ...state,
        isPlaying: action.payload,
      }

    case 'ADD_CLIP': {
      const newClip: VideoClip = {
        ...action.payload,
        id: generateClipId(),
        order: state.clips.length,
        duration: action.payload.endTime - action.payload.startTime,
      }

      const validation = validateClip(newClip, state.videoDuration)
      if (!validation.valid) {
        console.error('Invalid clip:', validation.error)
        return state
      }

      return {
        ...state,
        clips: [...state.clips, newClip],
      }
    }

    case 'REMOVE_CLIP':
      return {
        ...state,
        clips: state.clips
          .filter(clip => clip.id !== action.payload)
          .map((clip, index) => ({ ...clip, order: index })),
        selectedClipId: state.selectedClipId === action.payload ? null : state.selectedClipId,
      }

    case 'UPDATE_CLIP': {
      const validation = validateClip(action.payload, state.videoDuration)
      if (!validation.valid) {
        console.error('Invalid clip update:', validation.error)
        return state
      }

      return {
        ...state,
        clips: state.clips.map(clip =>
          clip.id === action.payload.id
            ? { ...action.payload, duration: action.payload.endTime - action.payload.startTime }
            : clip
        ),
      }
    }

    case 'REORDER_CLIPS': {
      const reordered = action.payload.map((clip, index) => ({
        ...clip,
        order: index,
      }))
      return {
        ...state,
        clips: reordered,
      }
    }

    case 'SELECT_CLIP':
      return {
        ...state,
        selectedClipId: action.payload,
      }

    case 'CLEAR_CLIPS':
      return {
        ...state,
        clips: [],
        selectedClipId: null,
      }

    default:
      return state
  }
}

export function useVideoEditorState() {
  const [state, dispatch] = useReducer(editorReducer, initialState)

  const setVideo = useCallback(
    (
      source: Blob | string,
      duration: number,
      fileName?: string,
      sourceType: 'file' | 'direct' | 'youtube' | 'facebook' | 'unknown' = 'unknown'
    ) => {
      dispatch({
        type: 'SET_VIDEO',
        payload: { source, duration, fileName, sourceType },
      })
    },
    []
  )

  const clearVideo = useCallback(() => {
    dispatch({ type: 'CLEAR_VIDEO' })
  }, [])

  const setCurrentTime = useCallback((time: number) => {
    dispatch({ type: 'SET_CURRENT_TIME', payload: time })
  }, [])

  const setPlaying = useCallback((playing: boolean) => {
    dispatch({ type: 'SET_PLAYING', payload: playing })
  }, [])

  const setVideoDuration = useCallback((duration: number) => {
    dispatch({ type: 'SET_VIDEO_DURATION', payload: duration })
  }, [])

  const addClip = useCallback(
    (startTime: number, endTime: number) => {
      dispatch({
        type: 'ADD_CLIP',
        payload: { startTime, endTime },
      })
    },
    []
  )

  const removeClip = useCallback((clipId: string) => {
    dispatch({ type: 'REMOVE_CLIP', payload: clipId })
  }, [])

  const updateClip = useCallback((clip: VideoClip) => {
    dispatch({ type: 'UPDATE_CLIP', payload: clip })
  }, [])

  const reorderClips = useCallback((clips: VideoClip[]) => {
    dispatch({ type: 'REORDER_CLIPS', payload: clips })
  }, [])

  const selectClip = useCallback((clipId: string | null) => {
    dispatch({ type: 'SELECT_CLIP', payload: clipId })
  }, [])

  const clearClips = useCallback(() => {
    dispatch({ type: 'CLEAR_CLIPS' })
  }, [])

  const sortedClips = sortClipsByOrder(state.clips)

  return {
    state,
    sortedClips,
    setVideo,
    clearVideo,
    setVideoDuration,
    setCurrentTime,
    setPlaying,
    addClip,
    removeClip,
    updateClip,
    reorderClips,
    selectClip,
    clearClips,
  }
}
