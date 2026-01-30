"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export type AudioSource = string | AudioBuffer

export interface UseAudioPlayerOptions {
  /** Called when playback completes naturally */
  onComplete?: () => void
  /** Called when an error occurs */
  onError?: (error: Error) => void
  /** Number of samples to use for waveform (default: 100) */
  waveformSamples?: number
}

export interface UseAudioPlayerReturn {
  /** Whether audio is currently playing */
  isPlaying: boolean
  /** Whether audio is loading/buffering */
  isLoading: boolean
  /** Current playback time in seconds */
  currentTime: number
  /** Total duration in seconds */
  duration: number
  /** Progress percentage (0-100) */
  progress: number
  /** Waveform data normalized to 0-1 range */
  waveformData: number[]
  /** Start or resume playback */
  play: () => Promise<void>
  /** Pause playback */
  pause: () => void
  /** Toggle play/pause */
  toggle: () => Promise<void>
  /** Seek to a specific time in seconds */
  seek: (time: number) => void
  /** Seek to a percentage (0-100) */
  seekPercent: (percent: number) => void
  /** Load a new audio source */
  load: (source: AudioSource) => Promise<void>
  /** Any error that occurred */
  error: Error | null
}

/**
 * Custom hook for audio playback with Web Audio API.
 * Supports both URL strings and AudioBuffer objects.
 */
export function useAudioPlayer(
  source?: AudioSource,
  options: UseAudioPlayerOptions = {}
): UseAudioPlayerReturn {
  const { onComplete, onError, waveformSamples = 100 } = options

  // State
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [waveformData, setWaveformData] = useState<number[]>([])
  const [error, setError] = useState<Error | null>(null)

  // Refs
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioBufferRef = useRef<AudioBuffer | null>(null)
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null)
  const startTimeRef = useRef<number>(0)
  const pausedAtRef = useRef<number>(0)
  const animationFrameRef = useRef<number | null>(null)

  // Initialize AudioContext lazily
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }
    return audioContextRef.current
  }, [])

  // Extract waveform data from AudioBuffer
  const extractWaveformData = useCallback(
    (buffer: AudioBuffer): number[] => {
      const rawData = buffer.getChannelData(0) // Use first channel
      const samples = waveformSamples
      const blockSize = Math.floor(rawData.length / samples)
      const filteredData: number[] = []

      for (let i = 0; i < samples; i++) {
        const blockStart = blockSize * i
        let sum = 0
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(rawData[blockStart + j])
        }
        filteredData.push(sum / blockSize)
      }

      // Normalize to 0-1
      const max = Math.max(...filteredData)
      if (max === 0) return filteredData.map(() => 0)
      return filteredData.map((val) => val / max)
    },
    [waveformSamples]
  )

  // Load audio from URL
  const loadFromUrl = useCallback(
    async (url: string): Promise<AudioBuffer> => {
      const context = getAudioContext()
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.statusText}`)
      }
      const arrayBuffer = await response.arrayBuffer()
      return await context.decodeAudioData(arrayBuffer)
    },
    [getAudioContext]
  )

  // Load audio source
  const load = useCallback(
    async (src: AudioSource) => {
      setIsLoading(true)
      setError(null)
      setIsPlaying(false)
      setCurrentTime(0)
      pausedAtRef.current = 0

      // Stop any existing playback
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop()
        sourceNodeRef.current.disconnect()
        sourceNodeRef.current = null
      }

      try {
        let buffer: AudioBuffer

        if (typeof src === "string") {
          buffer = await loadFromUrl(src)
        } else {
          buffer = src
        }

        audioBufferRef.current = buffer
        setDuration(buffer.duration)
        setWaveformData(extractWaveformData(buffer))
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        onError?.(error)
      } finally {
        setIsLoading(false)
      }
    },
    [loadFromUrl, extractWaveformData, onError]
  )

  // Update current time during playback
  const updateTime = useCallback(() => {
    if (!audioContextRef.current || !isPlaying) return

    const elapsed = audioContextRef.current.currentTime - startTimeRef.current
    const newTime = Math.min(pausedAtRef.current + elapsed, duration)
    setCurrentTime(newTime)

    if (newTime < duration) {
      animationFrameRef.current = requestAnimationFrame(updateTime)
    }
  }, [isPlaying, duration])

  // Play audio
  const play = useCallback(async () => {
    if (!audioBufferRef.current) return

    const context = getAudioContext()

    // Resume context if suspended (browser autoplay policy)
    if (context.state === "suspended") {
      await context.resume()
    }

    // Create new source node
    const sourceNode = context.createBufferSource()
    sourceNode.buffer = audioBufferRef.current
    sourceNode.connect(context.destination)

    // Handle playback end
    sourceNode.onended = () => {
      if (sourceNodeRef.current === sourceNode) {
        setIsPlaying(false)
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }
        // Check if it ended naturally (not stopped manually)
        const elapsed = context.currentTime - startTimeRef.current
        const expectedEnd = audioBufferRef.current!.duration - pausedAtRef.current
        if (elapsed >= expectedEnd - 0.1) {
          setCurrentTime(duration)
          pausedAtRef.current = 0
          onComplete?.()
        }
      }
    }

    // Start playback from paused position
    sourceNode.start(0, pausedAtRef.current)
    sourceNodeRef.current = sourceNode
    startTimeRef.current = context.currentTime

    setIsPlaying(true)
  }, [getAudioContext, duration, onComplete])

  // Pause audio
  const pause = useCallback(() => {
    if (!sourceNodeRef.current || !audioContextRef.current) return

    const elapsed = audioContextRef.current.currentTime - startTimeRef.current
    pausedAtRef.current = Math.min(pausedAtRef.current + elapsed, duration)

    sourceNodeRef.current.onended = null
    sourceNodeRef.current.stop()
    sourceNodeRef.current.disconnect()
    sourceNodeRef.current = null

    setIsPlaying(false)
    setCurrentTime(pausedAtRef.current)

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [duration])

  // Toggle play/pause
  const toggle = useCallback(async () => {
    if (isPlaying) {
      pause()
    } else {
      await play()
    }
  }, [isPlaying, play, pause])

  // Seek to specific time
  const seek = useCallback(
    (time: number) => {
      const clampedTime = Math.max(0, Math.min(time, duration))
      pausedAtRef.current = clampedTime
      setCurrentTime(clampedTime)

      // If playing, restart from new position
      if (isPlaying && sourceNodeRef.current) {
        sourceNodeRef.current.onended = null
        sourceNodeRef.current.stop()
        sourceNodeRef.current.disconnect()
        sourceNodeRef.current = null
        play()
      }
    },
    [duration, isPlaying, play]
  )

  // Seek to percentage
  const seekPercent = useCallback(
    (percent: number) => {
      const time = (percent / 100) * duration
      seek(time)
    },
    [duration, seek]
  )

  // Calculate progress
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  // Update time animation
  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateTime)
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isPlaying, updateTime])

  // Load initial source
  useEffect(() => {
    if (source) {
      load(source)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup
  useEffect(() => {
    return () => {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop()
        sourceNodeRef.current.disconnect()
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  return {
    isPlaying,
    isLoading,
    currentTime,
    duration,
    progress,
    waveformData,
    play,
    pause,
    toggle,
    seek,
    seekPercent,
    load,
    error,
  }
}
