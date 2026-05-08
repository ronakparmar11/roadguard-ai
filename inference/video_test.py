"""
video_test.py — Local Video Pothole Detection (PHASE 1)

Standalone script: loads best.pt, processes road.mp4 frame-by-frame,
draws YOLO bounding boxes, shows a live OpenCV preview, and saves output.mp4.

Usage:
    python video_test.py                        # defaults: road.mp4 → output.mp4
    python video_test.py --input my.mp4 --output result.mp4
    python video_test.py --no-preview           # headless, no window
"""

import argparse
import os
import sys
import time

import cv2
import torch
from ultralytics import YOLO
from video_encode import make_avi_writer, avi_to_h264_mp4, make_tmp_avi_path

# ─── Configuration defaults ─────────────────────────────────────────────────

DEFAULT_MODEL  = "models/best.pt"
DEFAULT_INPUT  = "road.mp4"
DEFAULT_OUTPUT = "output.mp4"
IMGSZ          = 640
CONF_THRESHOLD = 0.25

# Bounding-box drawing style
BOX_COLOR   = (21, 250, 250)   # BGR — cyan (#22D3EE equivalent)
BOX_THICK   = 2
LABEL_COLOR = (21, 250, 250)
LABEL_BG    = (15, 23, 42)     # dark slate
FONT        = cv2.FONT_HERSHEY_SIMPLEX
FONT_SCALE  = 0.55
FONT_THICK  = 1


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run YOLO pothole detection on a video file."
    )
    parser.add_argument(
        "--model", default=DEFAULT_MODEL,
        help=f"Path to YOLO weights (default: {DEFAULT_MODEL})",
    )
    parser.add_argument(
        "--input", default=DEFAULT_INPUT,
        help=f"Input video path (default: {DEFAULT_INPUT})",
    )
    parser.add_argument(
        "--output", default=DEFAULT_OUTPUT,
        help=f"Output video path (default: {DEFAULT_OUTPUT})",
    )
    parser.add_argument(
        "--no-preview", action="store_true",
        help="Disable live OpenCV preview window",
    )
    return parser.parse_args()


def select_device() -> str:
    """Pick CUDA if available, otherwise CPU."""
    if torch.cuda.is_available():
        dev = os.getenv("YOLO_DEVICE", "cuda:0")
        print(f"[INFO] Using device: {dev}")
        return dev
    print("[WARN] CUDA not available — falling back to CPU")
    return "cpu"


def load_model(weights: str) -> YOLO:
    """Load YOLO model onto the best available device."""
    if not os.path.isfile(weights):
        print(f"[ERROR] Model file not found: {weights}")
        sys.exit(1)
    device = select_device()
    model = YOLO(weights)
    model.to(device)
    print(f"[INFO] Loaded model: {weights}")
    return model


def draw_boxes(frame, results) -> int:
    """Draw bounding boxes + labels on the frame in-place. Returns detection count."""
    count = 0
    if not results:
        return count

    result = results[0]
    for box in result.boxes:
        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
        conf = float(box.conf)
        cls_id = int(box.cls)
        label_name = result.names.get(cls_id, str(cls_id))
        if label_name == "0":
            label_name = "pothole"

        label_text = f"{label_name} {conf * 100:.0f}%"

        # Draw bounding box
        cv2.rectangle(frame, (x1, y1), (x2, y2), BOX_COLOR, BOX_THICK)

        # Draw label background
        (tw, th), baseline = cv2.getTextSize(label_text, FONT, FONT_SCALE, FONT_THICK)
        label_y = y1 - 6 if y1 - 6 > th + 4 else y1 + th + 10
        cv2.rectangle(
            frame,
            (x1, label_y - th - 4),
            (x1 + tw + 8, label_y + baseline),
            LABEL_BG,
            cv2.FILLED,
        )

        # Draw label text
        cv2.putText(
            frame, label_text,
            (x1 + 4, label_y - 2),
            FONT, FONT_SCALE, LABEL_COLOR, FONT_THICK, cv2.LINE_AA,
        )
        count += 1
    return count



def process_video(model: YOLO, input_path: str, output_path: str, show_preview: bool):
    """Main processing loop: read → detect → annotate → write → (preview)."""

    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        print(f"[ERROR] Cannot open video: {input_path}")
        sys.exit(1)

    # Video metadata
    fps    = cap.get(cv2.CAP_PROP_FPS) or 30.0
    width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total  = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    print(f"[INFO] Input  : {input_path}")
    print(f"[INFO] Output : {output_path}")
    print(f"[INFO] Resolution: {width}x{height} @ {fps:.1f} FPS  |  {total} frames")
    print("-" * 70)

    # Write frames to a temp AVI (XVID), then re-encode to H.264 MP4
    # so the output plays natively in Chrome/Firefox.
    tmp_avi = make_tmp_avi_path(output_path)
    writer  = make_avi_writer(tmp_avi, fps, width, height)

    frame_idx = 0
    total_time = 0.0

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frame_idx += 1
            t0 = time.perf_counter()

            # Run YOLO inference on the frame
            results = model.predict(frame, imgsz=IMGSZ, conf=CONF_THRESHOLD, verbose=False)

            t1 = time.perf_counter()
            infer_ms = (t1 - t0) * 1000
            total_time += infer_ms

            # Draw bounding boxes
            det_count = draw_boxes(frame, results)

            # HUD overlay — frame counter + inference time
            hud = f"Frame {frame_idx}/{total}  |  {infer_ms:.1f}ms  |  {det_count} det"
            cv2.putText(frame, hud, (12, 30), FONT, 0.65, (255, 255, 255), 2, cv2.LINE_AA)

            # Write annotated frame
            writer.write(frame)

            # Console log
            print(f"  Frame {frame_idx:>5}/{total}  |  inference: {infer_ms:>7.1f} ms  |  detections: {det_count}")

            # Live preview
            if show_preview:
                cv2.imshow("Pothole Detection — press Q to quit", frame)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    print("\n[INFO] Preview closed by user (Q pressed)")
                    break

    finally:
        cap.release()
        writer.release()
        print("[INFO] Re-encoding to H.264 MP4 for browser compatibility...")
        avi_to_h264_mp4(tmp_avi, output_path)
        if show_preview:
            cv2.destroyAllWindows()

    avg_ms = total_time / max(frame_idx, 1)
    print("-" * 70)
    print(f"[DONE] Processed {frame_idx} frames in {total_time / 1000:.2f}s")
    print(f"[DONE] Avg inference: {avg_ms:.1f} ms/frame  ({1000 / avg_ms:.1f} FPS)")
    print(f"[DONE] Output saved → {output_path}")

det_count = draw_boxes(frame, results)

result = results[0]

filtered_boxes = apply_manual_nms(
    result,
    conf_thresh=0.25,
    iou_thresh=0.45
)

for det in filtered_boxes:
    x, y, w, h = det["box"]

    cv2.rectangle(
        frame,
        (x, y),
        (x + w, y + h),
        BOX_COLOR,
        BOX_THICK
    )

apply_manual_nms(
    result,
    iou_thresh=0.45
)

def main():
    args = parse_args()
    print("=" * 70)
    print("  POTHOLE VIDEO DETECTION — Local Inference (PHASE 1)")
    print("=" * 70)

    model = load_model(args.model)
    process_video(model, args.input, args.output, show_preview=not args.no_preview)


if __name__ == "__main__":
    main()
