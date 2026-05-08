import { API_BASE_URL, API_KEY } from '../config';

export const DETECT_VIDEO_ENDPOINT = `${API_BASE_URL}/detect-video`;
export const VIDEO_PROGRESS_BASE   = `${API_BASE_URL}/video-progress`;

export interface VideoDetectResult {
  videoUrl: string;
  totalFrames: number;
  totalDetections: number;
  avgInferenceMs: number;
  processingMs: number;
}

export interface VideoProgress {
  current_frame: number;
  total_frames: number;
  progress_percent: number;
  avg_inference_ms: number;
  eta_seconds: number;
  fps: number;
  total_detections: number;
  done: boolean;
  error: string | null;
}

/**
 * Upload a video file to the /detect-video endpoint.
 * Returns a blob URL to the annotated video + stats from response headers.
 */
export async function detectVideoApi(file: File): Promise<VideoDetectResult> {
  const formData = new FormData();
  formData.append('file', file, file.name);

  const response = await fetch(DETECT_VIDEO_ENDPOINT, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
    },
    body: formData,
  });

  if (!response.ok) {
    let detail = `Server error (${response.status})`;
    try {
      const json = await response.json();
      detail = json.detail ?? detail;
    } catch {
      // keep default detail
    }
    throw new Error(detail);
  }

  const blob = await response.blob();
  const videoUrl = URL.createObjectURL(blob);

  return {
    videoUrl,
    totalFrames:     parseInt(response.headers.get('X-Total-Frames') || '0', 10),
    totalDetections: parseInt(response.headers.get('X-Total-Detections') || '0', 10),
    avgInferenceMs:  parseFloat(response.headers.get('X-Avg-Inference-Ms') || '0'),
    processingMs:    parseFloat(response.headers.get('X-Processing-Ms') || '0'),
  };
}

/**
 * Open an SSE stream for progress updates on a video job.
 * Calls onProgress on each event, calls onDone when finished.
 * Returns a close() function to cancel early.
 */
export function openProgressStream(
  jobId: string,
  onProgress: (p: VideoProgress) => void,
  onDone: () => void,
): () => void {
  const url = `${VIDEO_PROGRESS_BASE}/${jobId}`;
  const es  = new EventSource(url);

  es.onmessage = (event) => {
    try {
      const data: VideoProgress = JSON.parse(event.data);
      onProgress(data);
      if (data.done || data.error) {
        es.close();
        onDone();
      }
    } catch {
      // ignore parse errors
    }
  };

  es.onerror = () => {
    es.close();
    onDone();
  };

  return () => es.close();
}
