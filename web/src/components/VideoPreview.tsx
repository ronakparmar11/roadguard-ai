import React from 'react';
import type { VideoDetectResult, VideoProgress } from '../api/videoApi';

interface VideoPreviewProps {
  resultVideoUrl: string | null;
  stats: VideoDetectResult | null;
  isProcessing: boolean;
  liveProgress: VideoProgress | null;
}

// ── Progress bar rendering ────────────────────────────────────────────────────

const ProgressBar: React.FC<{ pct: number }> = ({ pct }) => {
  const filled = Math.round(pct / 5); // 0–20 blocks
  const total  = 20;
  const bar    = Array.from({ length: total }, (_, i) => i < filled ? '█' : '░').join('');

  return (
    <div style={{ fontFamily: 'monospace', fontSize: 16, color: '#A78BFA', letterSpacing: 2 }}>
      [{bar}]
    </div>
  );
};

// ── Processing overlay ────────────────────────────────────────────────────────

const ProcessingOverlay: React.FC<{ liveProgress: VideoProgress | null }> = ({ liveProgress }) => {
  const curr  = liveProgress?.current_frame    ?? 0;
  const total = liveProgress?.total_frames     ?? 0;
  const pct   = liveProgress?.progress_percent ?? 0;
  const eta   = liveProgress?.eta_seconds      ?? 0;
  const fps   = liveProgress?.fps              ?? 0;
  const dets  = liveProgress?.total_detections ?? 0;

  const etaLabel = eta > 0
    ? eta >= 60
      ? `${Math.floor(eta / 60)}m ${Math.round(eta % 60)}s`
      : `${Math.round(eta)}s`
    : '—';

  const showStats = total > 0;

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 28, textAlign: 'center', padding: '40px 48px',
      background: '#070A0E',
    }}>
      {/* Spinner */}
      <div style={{
        width: 52, height: 52,
        border: '3px solid #1F2937',
        borderTopColor: '#A78BFA',
        borderRadius: '50%',
        animation: 'spin 0.9s linear infinite',
        flexShrink: 0,
      }} />

      {/* Title */}
      <div>
        <p style={{ fontSize: 18, fontWeight: 600, color: '#F9FAFB', marginBottom: 4 }}>
          Processing Video<span className="blink">...</span>
        </p>
        <p style={{ fontSize: 13, color: '#4B5563' }}>
          Running YOLO inference on each frame
        </p>
      </div>

      {/* Progress bar + pct */}
      <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <ProgressBar pct={pct} />

        {/* Percentage fill bar */}
        <div style={{ width: '100%', height: 6, background: '#1F2937', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #7C3AED, #A78BFA)',
            borderRadius: 4,
            transition: 'width 0.4s ease',
          }} />
        </div>

        {/* Percentage label */}
        <p style={{ fontSize: 24, fontWeight: 700, color: '#A78BFA', letterSpacing: '-0.02em', lineHeight: 1 }}>
          {pct.toFixed(1)}%
        </p>
      </div>

      {/* Stats grid */}
      {showStats ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px 32px',
          width: '100%',
          maxWidth: 340,
        }}>
          <ProgStat label="Frame" value={`${curr} / ${total}`} />
          <ProgStat label="ETA" value={etaLabel} highlight />
          <ProgStat label="FPS" value={fps > 0 ? fps.toFixed(1) : '—'} />
          <ProgStat label="Detections" value={dets.toString()} />
        </div>
      ) : (
        <p style={{ fontSize: 13, color: '#4B5563' }}>Preparing frames…</p>
      )}
    </div>
  );
};

// ── Result video player ───────────────────────────────────────────────────────

export const VideoPreview: React.FC<VideoPreviewProps> = ({
  resultVideoUrl,
  stats,
  isProcessing,
  liveProgress,
}) => {
  if (isProcessing) {
    return <ProcessingOverlay liveProgress={liveProgress} />;
  }

  if (resultVideoUrl && stats) {
    return (
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* ── Full-size video player ── */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000',
          overflow: 'hidden',
        }}>
          <video
            src={resultVideoUrl}
            controls
            autoPlay
            loop
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </div>

        {/* ── Stats bar ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          gap: 16,
          padding: '12px 24px',
          borderTop: '1px solid #1F2937',
          background: '#0D1117',
          flexWrap: 'wrap',
          flexShrink: 0,
        }}>
          <StatChip label="Frames"       value={stats.totalFrames.toString()} />
          <StatChip label="Detections"   value={stats.totalDetections.toString()} accent />
          <StatChip label="Avg / Frame"  value={`${stats.avgInferenceMs}ms`} />
          <StatChip label="Total Time"   value={`${(stats.processingMs / 1000).toFixed(1)}s`} />
          {liveProgress && liveProgress.fps > 0 && (
            <StatChip label="FPS" value={liveProgress.fps.toFixed(1)} />
          )}
        </div>
      </div>
    );
  }

  // ── Empty state ──
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 16, textAlign: 'center', padding: 40,
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 18,
        background: '#111827', border: '1px solid #1F2937',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="32" height="32" fill="none" stroke="#4B5563" strokeWidth="1.4" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
          />
        </svg>
      </div>
      <div>
        <p style={{ fontSize: 17, fontWeight: 500, color: '#94A3B8', marginBottom: 6 }}>
          No video uploaded
        </p>
        <p style={{ fontSize: 14, color: '#4B5563' }}>
          Upload an MP4 video to run detection
        </p>
      </div>
    </div>
  );
};


// ── Sub-components ────────────────────────────────────────────────────────────

const StatChip: React.FC<{ label: string; value: string; accent?: boolean }> = ({
  label, value, accent,
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
    <span style={{ fontSize: 11, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {label}
    </span>
    <span style={{ fontSize: 15, fontWeight: 700, color: accent ? '#A78BFA' : '#F9FAFB' }}>
      {value}
    </span>
  </div>
);

const ProgStat: React.FC<{ label: string; value: string; highlight?: boolean }> = ({
  label, value, highlight,
}) => (
  <div style={{ textAlign: 'left' }}>
    <p style={{ fontSize: 11, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
      {label}
    </p>
    <p style={{ fontSize: 16, fontWeight: 600, color: highlight ? '#22D3EE' : '#F9FAFB' }}>
      {value}
    </p>
  </div>
);
