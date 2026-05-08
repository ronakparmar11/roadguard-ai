"""
video_encode.py — Browser-compatible H.264 MP4 encoding helper.

ROOT CAUSE:
  OpenCV's 'mp4v' codec produces MPEG-4 Part 2 which Chrome/Firefox cannot
  play natively. The 'avc1'/'H264' fourcc codes fail silently on this machine
  because the openh264 DLL version is mismatched.

SOLUTION:
  1. OpenCV writes annotated frames to a temporary AVI file using the XVID codec
     (reliably available on Windows without extra DLLs).
  2. imageio-ffmpeg's bundled FFmpeg binary re-encodes the AVI to a proper
     H.264 + AAC MP4 with moov atom at the front (faststart) for browser streaming.

Usage:
    from video_encode import make_h264_writer, avi_to_h264_mp4

    writer, tmp_avi = make_h264_writer(output_mp4_path, fps, width, height)
    writer.write(frame)   # as many frames as needed
    writer.release()
    avi_to_h264_mp4(tmp_avi, output_mp4_path)  # convert and clean up tmp_avi
"""

import logging
import os
import subprocess
import tempfile

import cv2
import imageio_ffmpeg

logger = logging.getLogger("yolo_pothole_detection")

# The bundled ffmpeg exe shipped with imageio-ffmpeg (no system install needed)
_FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()


def make_avi_writer(
    tmp_avi_path: str,
    fps: float,
    width: int,
    height: int,
) -> cv2.VideoWriter:
    """
    Return an OpenCV VideoWriter that writes to a temp AVI (XVID codec).
    XVID is reliably available on Windows and produces valid output.
    """
    fourcc = cv2.VideoWriter_fourcc(*"XVID")
    writer = cv2.VideoWriter(tmp_avi_path, fourcc, fps, (width, height))
    if not writer.isOpened():
        # Fallback: MJPG also reliable on Windows
        fourcc = cv2.VideoWriter_fourcc(*"MJPG")
        writer = cv2.VideoWriter(tmp_avi_path, fourcc, fps, (width, height))
    if not writer.isOpened():
        raise RuntimeError(f"Cannot open VideoWriter for {tmp_avi_path}")
    return writer


def avi_to_h264_mp4(avi_path: str, mp4_path: str) -> None:
    """
    Convert an AVI file to a browser-playable H.264 MP4 using the bundled FFmpeg.

    Flags used:
      -c:v libx264   — H.264 video codec (universally supported by browsers)
      -preset fast   — good quality/speed balance
      -crf 23        — constant rate factor (quality: 18=best, 28=worst, 23=default)
      -pix_fmt yuv420p — required for broad browser/player compatibility
      -movflags +faststart — moves moov atom to front for HTTP streaming/autoplay
      -an            — no audio track (dashcam footage has no audio anyway)
      -y             — overwrite output without prompting
    """
    cmd = [
        _FFMPEG,
        "-y",
        "-i", avi_path,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        "-an",
        mp4_path,
    ]
    logger.info("Re-encoding %s -> %s (H.264 faststart)", avi_path, mp4_path)
    result = subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if result.returncode != 0:
        err = result.stderr.decode(errors="replace")
        logger.error("FFmpeg encoding failed:\n%s", err)
        raise RuntimeError(f"FFmpeg encoding failed (rc={result.returncode})")

    logger.info("H.264 MP4 written: %s (%.1f KB)", mp4_path, os.path.getsize(mp4_path) / 1024)

    # Clean up the intermediate AVI
    try:
        os.remove(avi_path)
    except OSError:
        pass


def make_tmp_avi_path(output_mp4_path: str) -> str:
    """Derive a sibling temp AVI path from the final MP4 path."""
    base = os.path.splitext(output_mp4_path)[0]
    return base + "_tmp.avi"
