import { DETECT_ENDPOINT, API_KEY } from '../config';

export interface Detection {
  label: string;
  confidence: number;
  box: [number, number, number, number]; // [x1, y1, x2, y2]
}

export interface DetectResponse {
  detections: Detection[];
  duration_ms: number;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
  ) {
    super(`API ${status}: ${detail}`);
    this.name = 'ApiError';
  }
}

/**
 * Send an image file to the backend /detect endpoint.
 * Returns the parsed JSON response on success, throws ApiError on failure.
 */
export async function detectPotholes(file: File): Promise<DetectResponse> {
  const formData = new FormData();
  formData.append('file', file, file.name);

  const response = await fetch(DETECT_ENDPOINT, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      Accept: 'application/json',
    },
    body: formData,
  });

  if (!response.ok) {
    let detail = `Server error (${response.status})`;
    try {
      const json = await response.json();
      detail = json.detail ?? detail;
    } catch {
      // ignore parse error, keep default detail
    }
    throw new ApiError(response.status, detail);
  }

  return response.json() as Promise<DetectResponse>;
}
