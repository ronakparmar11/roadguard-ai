import type { Detection } from '../api/detectApi';

const BOX_COLOR = '#facc15';        // yellow – matches existing UI accent
const LABEL_BG = 'rgba(15,23,42,0.75)';
const LABEL_TEXT = '#f1f5f9';
const FONT = '700 12px Inter, sans-serif';
const LINE_WIDTH = 2;

/**
 * Draw all bounding boxes + confidence labels onto a canvas element,
 * scaled to the canvas's rendered dimensions relative to the original image size.
 */
export function drawDetections(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  detections: Detection[],
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Match canvas resolution to its CSS display size
  const { offsetWidth: w, offsetHeight: h } = canvas;
  canvas.width = w;
  canvas.height = h;

  ctx.clearRect(0, 0, w, h);

  if (detections.length === 0) return;

  const scaleX = w / image.naturalWidth;
  const scaleY = h / image.naturalHeight;

  ctx.strokeStyle = BOX_COLOR;
  ctx.lineWidth = LINE_WIDTH;
  ctx.font = FONT;

  for (const det of detections) {
    const [x1, y1, x2, y2] = det.box;
    const rx = x1 * scaleX;
    const ry = y1 * scaleY;
    const rw = (x2 - x1) * scaleX;
    const rh = (y2 - y1) * scaleY;

    // Bounding box
    ctx.strokeRect(rx, ry, rw, rh);

    // Label background
    const labelText = `${det.label} ${(det.confidence * 100).toFixed(0)}%`;
    const textMetrics = ctx.measureText(labelText);
    const labelW = textMetrics.width + 10;
    const labelH = 18;
    const labelY = ry > labelH + 2 ? ry - labelH - 2 : ry + 2;

    ctx.fillStyle = LABEL_BG;
    ctx.fillRect(rx, labelY, labelW, labelH);

    // Label text
    ctx.fillStyle = LABEL_TEXT;
    ctx.fillText(labelText, rx + 5, labelY + 13);
  }
}
