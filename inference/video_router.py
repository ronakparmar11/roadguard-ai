"""
video_router.py — FastAPI router: POST /detect-video  +  GET /video-progress/{job_id}

Existing /detect endpoint is NOT touched.

New workflow:
  1. POST /detect-video  →  saves file, starts background processing thread,
                           returns X-Job-Id header immediately + streams output
                           video when done.
  2. GET  /video-progress/{job_id}  →  SSE stream of progress events while
                           processing is underway.
"""

import logging
import os
import tempfile
import threading
import time
import uuid
from typing import Any

import cv2
from inference.video_encode import (
    make_avi_writer,
    avi_to_h264_mp4,
    make_tmp_avi_path,
)
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse, StreamingResponse

logger = logging.getLogger("yolo_pothole_detection")

router = APIRouter()

# ─── Drawing constants ───────────────────────────────────────────────────────

BOX_COLOR   = (21, 250, 250)
BOX_THICK   = 2
LABEL_BG    = (15, 23, 42)
LABEL_COLOR = (21, 250, 250)
FONT        = cv2.FONT_HERSHEY_SIMPLEX
FONT_SCALE  = 0.55
FONT_THICK  = 1
IMGSZ       = 640
CONF_THRESH = 0.25

TEMP_DIR = os.path.join(tempfile.gettempdir(), "pothole_video")
os.makedirs(TEMP_DIR, exist_ok=True)

# ─── In-memory job registry ──────────────────────────────────────────────────
# { job_id: { current_frame, total_frames, avg_ms, eta_s, fps_proc,
#             done, error, output_path, total_detections } }

_jobs: dict[str, dict[str, Any]] = {}
_jobs_lock = threading.Lock()


def _new_job(job_id: str, output_path: str):
    with _jobs_lock:
        _jobs[job_id] = {
            "current_frame":    0,
            "total_frames":     0,
            "avg_ms":           0.0,
            "eta_s":            0.0,
            "fps_proc":         0.0,
            "total_detections": 0,
            "done":             False,
            "error":            None,
            "output_path":      output_path,
        }


def _update_job(job_id: str, **kwargs):
    with _jobs_lock:
        if job_id in _jobs:
            _jobs[job_id].update(kwargs)


def _get_job(job_id: str) -> dict | None:
    with _jobs_lock:
        j = _jobs.get(job_id)
        return dict(j) if j else None


def _cleanup_job(job_id: str):
    with _jobs_lock:
        _jobs.pop(job_id, None)


# ─── Drawing helper ──────────────────────────────────────────────────────────

def _draw_boxes(frame, results) -> int:
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

        cv2.rectangle(frame, (x1, y1), (x2, y2), BOX_COLOR, BOX_THICK)
        (tw, th), baseline = cv2.getTextSize(label_text, FONT, FONT_SCALE, FONT_THICK)
        ly = y1 - 6 if y1 - 6 > th + 4 else y1 + th + 10
        cv2.rectangle(frame, (x1, ly - th - 4), (x1 + tw + 8, ly + baseline), LABEL_BG, cv2.FILLED)
        cv2.putText(frame, label_text, (x1 + 4, ly - 2), FONT, FONT_SCALE, LABEL_COLOR, FONT_THICK, cv2.LINE_AA)
        count += 1
    return count


# ─── Core processing (runs in background thread) ─────────────────────────────

def _process_video_threaded(model, job_id: str, input_path: str, output_path: str):
    """Processes video in a background thread; updates _jobs[job_id] live."""
    try:
        cap = cv2.VideoCapture(input_path)
        if not cap.isOpened():
            _update_job(job_id, done=True, error="cannot_open_video")
            return

        fps    = cap.get(cv2.CAP_PROP_FPS) or 30.0
        width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total  = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        _update_job(job_id, total_frames=total)

        # Write annotated frames to a temp AVI (XVID — reliably works on Windows)
        # then re-encode to H.264 MP4 for browser compatibility.
        tmp_avi = make_tmp_avi_path(output_path)
        writer  = make_avi_writer(tmp_avi, fps, width, height)

        frame_idx        = 0
        total_detections = 0
        total_infer_ms   = 0.0
        window_ms: list[float] = []   # rolling window for live FPS estimate

        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                frame_idx += 1

                t0 = time.perf_counter()
                results = model.predict(frame, imgsz=IMGSZ, conf=CONF_THRESH, verbose=False)
                infer_ms = (time.perf_counter() - t0) * 1000

                det_count = _draw_boxes(frame, results)
                total_detections += det_count
                total_infer_ms   += infer_ms

                # Rolling window (last 10 frames) for smoother FPS/ETA
                window_ms.append(infer_ms)
                if len(window_ms) > 10:
                    window_ms.pop(0)
                avg_window = sum(window_ms) / len(window_ms)
                remaining  = max(total - frame_idx, 0)
                eta_s      = (remaining * avg_window) / 1000.0
                fps_proc   = 1000.0 / avg_window if avg_window > 0 else 0.0

                # HUD overlay
                hud = f"Frame {frame_idx}/{total}  |  {infer_ms:.1f}ms  |  {det_count} det"
                cv2.putText(frame, hud, (12, 30), FONT, 0.65, (255, 255, 255), 2, cv2.LINE_AA)
                writer.write(frame)

                _update_job(
                    job_id,
                    current_frame=frame_idx,
                    avg_ms=round(total_infer_ms / frame_idx, 1),
                    eta_s=round(eta_s, 1),
                    fps_proc=round(fps_proc, 1),
                    total_detections=total_detections,
                )
        finally:
            cap.release()
            writer.release()
            # Re-encode AVI -> H.264 MP4 (browser-compatible)
            avi_to_h264_mp4(tmp_avi, output_path)

        avg_ms = total_infer_ms / max(frame_idx, 1)
        _update_job(
            job_id,
            done=True,
            current_frame=frame_idx,
            total_frames=frame_idx,
            avg_ms=round(avg_ms, 1),
            eta_s=0.0,
            fps_proc=round(1000.0 / avg_ms if avg_ms > 0 else 0.0, 1),
            total_detections=total_detections,
        )
        logger.info("Video job %s done: frames=%d detections=%d", job_id, frame_idx, total_detections)

    except Exception as exc:
        logger.exception("Video job %s failed: %s", job_id, exc)
        _update_job(job_id, done=True, error=str(exc))
    finally:
        if os.path.exists(input_path):
            try:
                os.remove(input_path)
            except OSError:
                pass


# ─── Endpoint factory ─────────────────────────────────────────────────────────

def create_video_endpoint(model, require_api_key):
    """
    Factory that closes over the already-loaded model and auth dependency.
    Called once from server.py. Returns the router with two new endpoints.
    """

    # ── POST /detect-video ────────────────────────────────────────────────────
    @router.post("/detect-video", dependencies=[Depends(require_api_key)])
    async def detect_video(file: UploadFile = File(...)):
        ct = (file.content_type or "").lower()
        if "video" not in ct and not (file.filename or "").lower().endswith(".mp4"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="unsupported_file_type_mp4_only",
            )

        uid         = uuid.uuid4().hex[:12]
        input_path  = os.path.join(TEMP_DIR, f"in_{uid}.mp4")
        output_path = os.path.join(TEMP_DIR, f"out_{uid}.mp4")

        try:
            video_bytes = await file.read()
            if not video_bytes:
                raise HTTPException(status_code=400, detail="empty_file")

            with open(input_path, "wb") as f:
                f.write(video_bytes)

            logger.info("Video upload: file=%s size=%d bytes job=%s", file.filename, len(video_bytes), uid)

            # Register job and start background thread
            _new_job(uid, output_path)
            t = threading.Thread(
                target=_process_video_threaded,
                args=(model, uid, input_path, output_path),
                daemon=True,
            )
            t.start()

            # Wait for processing to finish (blocking — keeps the response simple)
            t.join()

            job = _get_job(uid)
            if job and job.get("error"):
                raise HTTPException(status_code=500, detail=job["error"])

            if not os.path.exists(output_path):
                raise HTTPException(status_code=500, detail="output_video_missing")

            return FileResponse(
                path=output_path,
                media_type="video/mp4",
                filename=f"pothole_detected_{uid}.mp4",
                headers={
                    "X-Job-Id":             uid,
                    "X-Total-Frames":       str(job["total_frames"] if job else 0),
                    "X-Total-Detections":   str(job["total_detections"] if job else 0),
                    "X-Avg-Inference-Ms":   str(job["avg_ms"] if job else 0),
                    "X-Processing-Ms":      str(job["avg_ms"] * job["total_frames"] if job else 0),
                },
            )

        except HTTPException:
            raise
        except Exception as exc:
            logger.exception("Video detection failed: %s", exc)
            raise HTTPException(status_code=500, detail="video_inference_failed") from exc
        finally:
            _cleanup_job(uid)

    # ── GET /video-progress/{job_id}  (SSE) ──────────────────────────────────
    @router.get("/video-progress/{job_id}")
    async def video_progress(job_id: str):
        """
        Server-Sent Events stream that emits JSON progress updates every ~300 ms
        while the video is being processed. Closes automatically when done.
        """
        import json

        def event_stream():
            sent_done = False
            max_ticks = 3600  # safety cutoff: ~18 min at 300 ms
            ticks = 0
            while ticks < max_ticks:
                ticks += 1
                job = _get_job(job_id)

                if job is None:
                    # Job not found or already cleaned up
                    payload = json.dumps({"error": "job_not_found"})
                    yield f"data: {payload}\n\n"
                    break

                total  = job["total_frames"]
                curr   = job["current_frame"]
                pct    = round((curr / total * 100) if total > 0 else 0, 1)

                payload = json.dumps({
                    "current_frame":    curr,
                    "total_frames":     total,
                    "progress_percent": pct,
                    "avg_inference_ms": job["avg_ms"],
                    "eta_seconds":      job["eta_s"],
                    "fps":              job["fps_proc"],
                    "total_detections": job["total_detections"],
                    "done":             job["done"],
                    "error":            job["error"],
                })
                yield f"data: {payload}\n\n"

                if job["done"] and not sent_done:
                    sent_done = True
                    break

                time.sleep(0.3)

        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control":               "no-cache",
                "X-Accel-Buffering":           "no",
                "Access-Control-Allow-Origin": "*",
            },
        )

    return router
