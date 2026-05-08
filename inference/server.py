import logging
import os
import time
from io import BytesIO
from typing import List

import torch
from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError
from ultralytics import YOLO


LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("yolo_pothole_detection")


API_KEY = os.getenv("API_KEY")
if not API_KEY:
    raise RuntimeError("API_KEY environment variable is required for authentication.")


def require_api_key(x_api_key: str | None = Header(default=None)):
    if x_api_key != API_KEY:
        logger.warning("Authentication failed for request.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_api_key"
        )


def select_device() -> str:
    if torch.cuda.is_available():
        return os.getenv("YOLO_DEVICE", "cuda:0")
    logger.warning("CUDA not available; falling back to CPU.")
    return "cpu"


def load_model() -> YOLO:
    weights_path = os.getenv("MODEL_PATH", "models/best.pt")
    device = select_device()
    try:
        yolo_model = YOLO(weights_path)
        yolo_model.to(device)
        logger.info("Loaded model=%s on device=%s", weights_path, device)
        return yolo_model
    except Exception as exc:  # noqa: BLE001
        logger.exception("Model load failed: %s", exc)
        raise


model = load_model()

app = FastAPI(title="YOLO Detection API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Frames", "X-Total-Detections", "X-Avg-Inference-Ms", "X-Processing-Ms"],
)


@app.post("/detect", dependencies=[Depends(require_api_key)])
async def detect(file: UploadFile = File(...)):
    started = time.perf_counter()
    try:
        image_bytes = await file.read()
        if not image_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="empty_file"
            )

        logger.info(
            "Received file=%s size=%d bytes content_type=%s",
            file.filename,
            len(image_bytes),
            file.content_type,
        )

        try:
            image = Image.open(BytesIO(image_bytes)).convert("RGB")
        except UnidentifiedImageError as exc:
            logger.warning("Invalid image upload: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_image"
            ) from exc

        results = model.predict(image, imgsz=640, conf=0.25, verbose=False)
        detections: List[dict] = []

        if results:
            result = results[0]
            for box in result.boxes:
                detections.append(
                    {
                        "label": 'pothole' if result.names[int(box.cls)] == '0' else result.names[int(box.cls)],
                        "confidence": float(box.conf),
                        "box": box.xyxy[0].tolist(),  # [x1, y1, x2, y2]
                    }
                )

        elapsed_ms = (time.perf_counter() - started) * 1000
        logger.info(
            "Completed detection count=%d conf>=0.25 imgsz=640 duration_ms=%.1f",
            len(detections),
            elapsed_ms,
        )
        return {"detections": detections, "duration_ms": elapsed_ms}
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.exception("Detection failed: %s", exc)
        raise HTTPException(status_code=500, detail="inference_failed") from exc


@app.get("/health")
async def health():
    return {"status": "ok"}


# ── Video detection endpoint (additive — does NOT modify anything above) ─────
from inference.video_router import create_video_endpoint
app.include_router(create_video_endpoint(model, require_api_key))
