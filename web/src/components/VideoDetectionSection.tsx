import React from 'react';
import { useVideoDetection } from '../hooks/useVideoDetection';
import { VideoDropZone } from './VideoDropZone';
import { VideoPreview } from './VideoPreview';

/**
 * Self-contained video detection section.
 * Drop this into App.tsx as a sibling section — no changes to image workflow.
 */
export const VideoDetectionSection: React.FC = () => {
  const {
    status, resultVideoUrl, stats, errorMessage,
    handleVideoFile, resetVideo, liveProgress,
  } = useVideoDetection();

  const isProcessing = status === 'uploading' || status === 'processing';
  const hasResult    = status === 'success';
  const hasError     = status === 'error';

  return (
    <section id="video-detection" style={{ paddingTop: 0, paddingBottom: 120 }}>
      <div className="container">

        {/* Section label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <span style={{
            fontSize: 13, fontWeight: 600, color: '#4B5563',
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            Video Detection
          </span>
          <span style={{
            fontSize: 11, fontWeight: 600, color: '#A78BFA',
            background: 'rgba(167,139,250,0.12)', padding: '3px 10px',
            borderRadius: 6, letterSpacing: '0.04em',
          }}>
            NEW
          </span>
          <div style={{ flex: 1, height: 1, background: '#1F2937' }} />
        </div>

        {/* Card shell */}
        <div className="card card-lg" style={{ overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
          <div className="grid-detection">

            {/* ── LEFT: Upload panel (35%) ─────────────────────────── */}
            <div style={{
              borderRight: '1px solid #1F2937',
              display: 'flex',
              flexDirection: 'column',
              background: '#0D1117',
            }}>
              {/* Header */}
              <div className="panel-header">
                <span className="panel-header-title">Video Ingestion</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 500, color: '#A78BFA' }}>
                  <span className="pulse-dot" style={{
                    display: 'inline-block', width: 7, height: 7,
                    borderRadius: '50%', background: '#A78BFA',
                  }} />
                  {isProcessing ? 'Processing' : 'Ready'}
                </span>
              </div>

              {/* Drop zone area */}
              <div style={{ flex: 1, padding: 28, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
                <VideoDropZone onFile={handleVideoFile} disabled={isProcessing} />

                {/* Reset button */}
                {(hasResult || hasError) && (
                  <button id="video-reset-btn" onClick={resetVideo} className="btn-ghost">
                    Clear &amp; Upload New Video
                  </button>
                )}

                {/* Error */}
                {hasError && errorMessage && (
                  <div
                    id="video-error-banner"
                    role="alert"
                    style={{
                      background: 'rgba(127,29,29,0.3)',
                      border: '1px solid rgba(185,28,28,0.4)',
                      borderRadius: 10,
                      padding: '14px 18px',
                    }}
                  >
                    <p style={{ fontSize: 14, color: '#F87171', lineHeight: 1.55 }}>{errorMessage}</p>
                  </div>
                )}

                {/* Info note */}
                <div style={{
                  background: 'rgba(167,139,250,0.06)',
                  border: '1px solid rgba(167,139,250,0.15)',
                  borderRadius: 10,
                  padding: '12px 16px',
                }}>
                  <p style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.55 }}>
                    <span style={{ color: '#A78BFA', fontWeight: 600 }}>ℹ</span>{' '}
                    Upload an MP4 video. Each frame is processed through YOLO for pothole detection.
                    Processing time depends on video length.
                  </p>
                </div>
              </div>

              {/* Footer status */}
              <div style={{
                borderTop: '1px solid #1F2937',
                padding: '14px 28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 13, color: '#4B5563' }}>Status</span>
                <span style={{ fontSize: 13, color: '#4B5563' }}>
                  {isProcessing ? 'Processing…' : hasResult ? 'Complete' : 'Idle'}
                </span>
              </div>
            </div>

            {/* ── RIGHT: Preview panel (65%) ───────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', background: '#080C11' }}>

              {/* Header */}
              <div className="panel-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="pulse-dot" style={{
                    display: 'inline-block', width: 8, height: 8,
                    borderRadius: '50%', background: '#A78BFA',
                  }} />
                  <span className="panel-header-title">Video Output</span>
                </div>
                <div>
                  {isProcessing && (
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#A78BFA' }}>
                      Processing<span className="blink">...</span>
                    </span>
                  )}
                  {hasResult && stats && (
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#A78BFA' }}>
                      {stats.totalDetections} total detection{stats.totalDetections !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* Preview area */}
              <div
                id="video-preview-area"
                style={{ flex: 1, position: 'relative', background: '#070A0E', overflow: 'hidden' }}
              >
                <VideoPreview
                  resultVideoUrl={resultVideoUrl}
                  stats={stats}
                  isProcessing={isProcessing}
                  liveProgress={liveProgress}
                />
              </div>
            </div>

          </div>{/* /grid-detection */}
        </div>{/* /card */}

      </div>{/* /container */}
    </section>
  );
};
