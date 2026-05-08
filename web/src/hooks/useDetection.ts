import { useState, useCallback, useRef } from 'react';
import { detectPotholes, ApiError } from '../api/detectApi';
import type { Detection } from '../api/detectApi';
import { ACCEPTED_MIME_TYPES } from '../config';

export type DetectionStatus = 'idle' | 'loading' | 'success' | 'error';

export interface DetectionState {
  status: DetectionStatus;
  imageFile: File | null;
  imageUrl: string | null;
  detections: Detection[];
  durationMs: number | null;
  errorMessage: string | null;
}

export interface UseDetectionReturn extends DetectionState {
  handleFile: (file: File) => void;
  reset: () => void;
  imageRef: React.RefObject<HTMLImageElement | null>;
}

const INITIAL_STATE: DetectionState = {
  status: 'idle',
  imageFile: null,
  imageUrl: null,
  detections: [],
  durationMs: null,
  errorMessage: null,
};

export function useDetection(): UseDetectionReturn {
  const [state, setState] = useState<DetectionState>(INITIAL_STATE);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      setState(prev => ({
        ...prev,
        status: 'error',
        errorMessage: `Unsupported file type "${file.type}". Please upload a JPG or PNG.`,
      }));
      return;
    }

    // Revoke previous object URL to avoid memory leaks
    setState(prev => {
      if (prev.imageUrl) URL.revokeObjectURL(prev.imageUrl);
      return {
        ...INITIAL_STATE,
        status: 'loading',
        imageFile: file,
        imageUrl: URL.createObjectURL(file),
      };
    });

    try {
      const result = await detectPotholes(file);
      setState(prev => ({
        ...prev,
        status: 'success',
        detections: result.detections,
        durationMs: result.duration_ms,
      }));
    } catch (err) {
      const message =
        err instanceof ApiError
          ? `${err.detail} (HTTP ${err.status})`
          : err instanceof Error
          ? err.message
          : 'Unknown error occurred';

      setState(prev => ({
        ...prev,
        status: 'error',
        detections: [],
        durationMs: null,
        errorMessage: message,
      }));
    }
  }, []);

  const reset = useCallback(() => {
    setState(prev => {
      if (prev.imageUrl) URL.revokeObjectURL(prev.imageUrl);
      return INITIAL_STATE;
    });
  }, []);

  return { ...state, handleFile, reset, imageRef };
}
