import React, { useEffect, useRef } from 'react';
import type { Detection } from '../api/detectApi';
import { drawDetections } from '../utils/canvasDraw';

interface ImagePreviewProps {
  imageUrl: string;
  detections: Detection[];
  isLoading: boolean;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  imageUrl,
  detections,
  isLoading,
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    const draw = () => {
      if (detections.length > 0) {
        drawDetections(canvas, img, detections);
      } else {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = canvas.offsetWidth;
          canvas.height = canvas.offsetHeight;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    };

    if (img.complete && img.naturalWidth > 0) {
      draw();
    } else {
      img.onload = draw;
    }

    return () => { img.onload = null; };
  }, [imageUrl, detections]);

  return (
    <div className="relative w-full h-full">
      <img
        ref={imgRef}
        src={imageUrl}
        alt="Uploaded image for pothole detection"
        className="w-full h-full object-contain"
        style={{ display: 'block' }}
      />
      <canvas
        ref={canvasRef}
        className="bbox-canvas"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Analyzing overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0B0F14]/70 backdrop-blur-sm rounded-xl">
          <div className="flex flex-col items-center gap-4">
            <svg
              className="w-10 h-10 animate-spin text-[#22D3EE]"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-20"
                cx="12" cy="12" r="10"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="opacity-90"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            <div className="text-center">
              <p className="text-[#F9FAFB] text-lg font-semibold">
                Analyzing<span className="blink">...</span>
              </p>
              <p className="text-[#94A3B8] text-sm mt-1">Running YOLO inference</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
