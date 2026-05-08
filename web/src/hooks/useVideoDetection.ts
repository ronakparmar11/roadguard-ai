import { useState, useCallback, useRef, useEffect } from 'react';
import { detectVideoApi } from '../api/videoApi';
import type { VideoDetectResult, VideoProgress } from '../api/videoApi';

export type VideoStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

export interface VideoDetectionState {
  status: VideoStatus;
  videoFile: File | null;
  resultVideoUrl: string | null;
  stats: VideoDetectResult | null;
  errorMessage: string | null;
  progress: string;
  // Live progress fields
  liveProgress: VideoProgress | null;
}

export interface UseVideoDetectionReturn extends VideoDetectionState {
  handleVideoFile: (file: File) => void;
  resetVideo: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

const INITIAL: VideoDetectionState = {
  status: 'idle',
  videoFile: null,
  resultVideoUrl: null,
  stats: null,
  errorMessage: null,
  progress: '',
  liveProgress: null,
};

export function useVideoDetection(): UseVideoDetectionReturn {
  const [state, setState] = useState<VideoDetectionState>(INITIAL);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // Ref to hold SSE close function so we can cancel on reset/unmount
  const closeSSERef = useRef<(() => void) | null>(null);

  // Close SSE on unmount
  useEffect(() => {
    return () => {
      closeSSERef.current?.();
    };
  }, []);

  const handleVideoFile = useCallback(async (file: File) => {
    // Validate file type
    const ext = file.name.toLowerCase().split('.').pop();
    const isVideo = file.type.startsWith('video/') || ext === 'mp4';
    if (!isVideo) {
      setState(prev => ({
        ...prev,
        status: 'error',
        errorMessage: `Unsupported file type "${file.type}". Please upload an MP4 video.`,
      }));
      return;
    }

    // Cancel any existing SSE stream
    closeSSERef.current?.();
    closeSSERef.current = null;

    // Clean up previous blob URL
    setState(prev => {
      if (prev.resultVideoUrl) URL.revokeObjectURL(prev.resultVideoUrl);
      return {
        ...INITIAL,
        status: 'uploading',
        videoFile: file,
        progress: 'Uploading video...',
      };
    });

    try {
      // Transition to processing state
      setState(prev => ({
        ...prev,
        status: 'processing',
        progress: 'Processing frames with YOLO...',
      }));

      // Open SSE stream speculatively using a "pending" job id.
      // The backend assigns a job_id synchronously, but since we don't have it
      // before the fetch resolves, we poll progress by starting a synthetic
      // progress tick until detectVideoApi() resolves.
      //
      // Strategy: poll /video-progress via a simple 300ms interval that checks
      // if the last job is running. Since jobs are keyed by uid and we pass
      // uid in X-Job-Id header of the *response*, we start the SSE stream
      // right after the fetch promise settles.
      //
      // For a smoother UX we also do a synthetic animated counter while waiting.
      let animFrame = 0;
      let animTotal = 100; // placeholder until we get real total
      const animTimer = setInterval(() => {
        animFrame = Math.min(animFrame + 1, animTotal - 1);
        setState(prev => {
          if (prev.status !== 'processing') {
            clearInterval(animTimer);
            return prev;
          }
          return {
            ...prev,
            liveProgress: {
              current_frame: animFrame,
              total_frames: animTotal,
              progress_percent: Math.round((animFrame / animTotal) * 100 * 10) / 10,
              avg_inference_ms: 0,
              eta_seconds: 0,
              fps: 0,
              total_detections: 0,
              done: false,
              error: null,
            },
          };
        });
      }, 600);

      // Start the actual fetch (blocking — waits for full video processing)
      const result = await detectVideoApi(file);

      // Stop synthetic animation
      clearInterval(animTimer);

      // Get the job id from response headers for the SSE stream
      // (The SSE stream already finished server-side by now, but we can still
      // connect to get the final "done" event with accurate stats)
      setState(prev => ({
        ...prev,
        status: 'success',
        resultVideoUrl: result.videoUrl,
        stats: result,
        progress: '',
        liveProgress: {
          current_frame: result.totalFrames,
          total_frames: result.totalFrames,
          progress_percent: 100,
          avg_inference_ms: result.avgInferenceMs,
          eta_seconds: 0,
          fps: result.avgInferenceMs > 0 ? Math.round((1000 / result.avgInferenceMs) * 10) / 10 : 0,
          total_detections: result.totalDetections,
          done: true,
          error: null,
        },
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        status: 'error',
        resultVideoUrl: null,
        stats: null,
        errorMessage: message,
        progress: '',
        liveProgress: null,
      }));
    }
  }, []);

  const resetVideo = useCallback(() => {
    closeSSERef.current?.();
    closeSSERef.current = null;
    setState(prev => {
      if (prev.resultVideoUrl) URL.revokeObjectURL(prev.resultVideoUrl);
      return INITIAL;
    });
  }, []);

  return { ...state, handleVideoFile, resetVideo, videoRef };
}
