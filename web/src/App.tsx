import React, { useMemo } from 'react';
import { useDetection } from './hooks/useDetection';
import { DropZone } from './components/DropZone';
import { ImagePreview } from './components/ImagePreview';
import { MetricCard, DeviceStatusCard } from './components/MetricCard';
import { VideoDetectionSection } from './components/VideoDetectionSection';

// ── helpers ───────────────────────────────────────────────────────────────────

function topConfidence(
  detections: ReturnType<typeof useDetection>['detections'],
): string {
  if (detections.length === 0) return '—';
  const top = Math.max(...detections.map(d => d.confidence));
  return `${(top * 100).toFixed(1)}%`;
}

function inferenceDisplay(ms: number | null): { value: string; unit: string } {
  if (ms === null) return { value: '—', unit: '' };
  return { value: Math.round(ms).toString(), unit: 'ms' };
}

// ── static data ───────────────────────────────────────────────────────────────

const NAV_LINKS = ['DEMO', 'METRICS', 'TECH STACK', 'IMPACT'] as const;

const TECH_STACK = [
  { icon: '👁',  name: 'YOLO',    desc: 'Real-time object detection model.'     },
  { icon: '⚡',  name: 'FastAPI', desc: 'High-performance backend API.'          },
  { icon: '🔥',  name: 'PyTorch', desc: 'Deep learning framework core.'          },
  { icon: '🖼',  name: 'OpenCV',  desc: 'Computer vision processing library.'   },
  { icon: '⚛',   name: 'React',   desc: 'Frontend user interface.'               },
] as const;

// ── App ───────────────────────────────────────────────────────────────────────

const App: React.FC = () => {
  const {
    status, imageUrl, detections, durationMs, errorMessage, handleFile, reset,
  } = useDetection();

  const isLoading = status === 'loading';
  const hasResult = status === 'success';
  const hasError  = status === 'error';

  const highestConf = useMemo(() => topConfidence(detections), [detections]);
  const inference   = useMemo(() => inferenceDisplay(durationMs), [durationMs]);

  return (
    <div style={{ minHeight: '100vh', background: '#0B0F14', color: '#F9FAFB', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ══════════════════════════════════════════════════════
          NAVBAR — sticky, centered, 80px horizontal padding
      ══════════════════════════════════════════════════════ */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(11,15,20,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #1F2937',
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', height: 68 }}>

          {/* Wordmark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 48, flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <polygon points="11,1 21,21 1,21" stroke="#22D3EE" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
              <circle cx="11" cy="15" r="2.2" fill="#22D3EE" />
            </svg>
            <span style={{ fontSize: 16, fontWeight: 600, color: '#F9FAFB', letterSpacing: '-0.01em' }}>
              RoadGuard AI

            </span>
          </div>

          {/* Nav links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            {NAV_LINKS.map(link => (
              <a
                key={link}
                href={`#${link.toLowerCase().replace(' ', '-')}`}
                className={`nav-link${link === 'DEMO' ? ' active' : ''}`}
              >
                {link}
              </a>
            ))}
          </div>

          {/* CTA */}
          <div style={{ marginLeft: 'auto' }}>
            <a href="#live-detection" className="btn-primary" style={{ padding: '10px 22px', fontSize: 14, borderRadius: 10 }}>
              Live Demo
            </a>
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════
          SECTION 1 — HERO
          140px top/bottom, content max-w 900px, cinematic
      ══════════════════════════════════════════════════════ */}
      <section
        id="demo"
        style={{
          paddingTop: 140,
          paddingBottom: 140,
          display: 'flex',
          alignItems: 'center',
          minHeight: '90vh',
        }}
      >
        <div className="container">
          <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>

            {/* Title */}
            <h1 className="hero-title" style={{ marginBottom: 28 }}>
              RoadGuard AI
            </h1>

            {/* Subtitle */}
            <p style={{ fontSize: 22, color: '#94A3B8', lineHeight: 1.6, marginBottom: 40, maxWidth: 560, margin: '0 auto 40px' }}>
              Real-time pothole detection powered by computer vision
            </p>

            {/* Tech tags */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 52 }}>
              {['YOLO', 'FastAPI', 'PyTorch', 'OpenCV'].map(t => (
                <span key={t} className="tech-badge">{t}</span>
              ))}
            </div>

            {/* CTA buttons */}
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="#live-detection" className="btn-primary">
                Try Live Detection
              </a>
              <a href="#tech-stack" className="btn-secondary">
                View Architecture
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 2 — DETECTION DEMO
          CSS Grid 35% / 65%, 650px height
      ══════════════════════════════════════════════════════ */}
      <section id="live-detection" className="section">
        <div className="container">

          {/* Section label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Detection Demo
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
                  <span className="panel-header-title">Data Ingestion</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 500, color: '#22D3EE' }}>
                    <span className="pulse-dot" style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#22D3EE' }} />
                    Ready
                  </span>
                </div>

                {/* Drop zone area */}
                <div style={{ flex: 1, padding: 28, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
                  <DropZone onFile={handleFile} disabled={isLoading} />

                  {/* Reset button */}
                  {(hasResult || hasError || imageUrl) && (
                    <button id="reset-btn" onClick={reset} className="btn-ghost">
                      Clear &amp; Upload New
                    </button>
                  )}

                  {/* Error */}
                  {hasError && errorMessage && (
                    <div
                      id="error-banner"
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
                  <span style={{ fontSize: 13, color: '#4B5563' }}>Queue</span>
                  <span style={{ fontSize: 13, color: '#4B5563' }}>
                    {isLoading ? '1 item' : '0 items'}
                  </span>
                </div>
              </div>

              {/* ── RIGHT: Preview panel (65%) ───────────────────────── */}
              <div style={{ display: 'flex', flexDirection: 'column', background: '#080C11' }}>

                {/* Header */}
                <div className="panel-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="pulse-dot" style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#22D3EE' }} />
                    <span className="panel-header-title">Live Detection</span>
                  </div>
                  <div>
                    {isLoading && (
                      <span style={{ fontSize: 14, fontWeight: 500, color: '#22D3EE' }}>
                        Analyzing<span className="blink">...</span>
                      </span>
                    )}
                    {hasResult && (
                      <span style={{ fontSize: 14, fontWeight: 500, color: '#22D3EE' }}>
                        {detections.length} detection{detections.length !== 1 ? 's' : ''} found
                      </span>
                    )}
                  </div>
                </div>

                {/* Preview area */}
                <div
                  id="preview-area"
                  style={{ flex: 1, position: 'relative', background: '#070A0E', overflow: 'hidden' }}
                >
                  {imageUrl ? (
                    <ImagePreview
                      imageUrl={imageUrl}
                      detections={hasResult ? detections : []}
                      isLoading={isLoading}
                    />
                  ) : (
                    /* Empty state */
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
                            d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p style={{ fontSize: 17, fontWeight: 500, color: '#94A3B8', marginBottom: 6 }}>
                          No image uploaded
                        </p>
                        <p style={{ fontSize: 14, color: '#4B5563' }}>
                          Upload a JPG or PNG to run detection
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>{/* /grid-detection */}
          </div>{/* /card */}

        </div>{/* /container */}
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 2b — VIDEO DETECTION (additive)
      ══════════════════════════════════════════════════════ */}
      <VideoDetectionSection />

      {/* ══════════════════════════════════════════════════════
          SECTION 3 — METRICS
          4-column grid, 160px cards, 48px numbers
      ══════════════════════════════════════════════════════ */}
      <section id="metrics" className="section" style={{ paddingTop: 0 }}>
        <div className="container">

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Metrics
            </span>
            <div style={{ flex: 1, height: 1, background: '#1F2937' }} />
          </div>

          <div className="grid-metrics">
            <MetricCard
              label="Detection Count"
              value={hasResult ? detections.length : isLoading ? '—' : '0'}
              accent={hasResult && detections.length > 0}
            />
            <MetricCard
              label="Confidence"
              value={hasResult ? highestConf : '—'}
              accent={hasResult && detections.length > 0}
            />
            <MetricCard
              label="Inference Time"
              value={inference.value}
              unit={inference.unit || undefined}
              accent={hasResult}
            />
            <DeviceStatusCard device="CPU" />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 4 — TECH STACK
          5-column grid, 180px cards
      ══════════════════════════════════════════════════════ */}
      <section id="tech-stack" className="section" style={{ paddingTop: 0 }}>
        <div className="container">

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
            <span className="section-title">Tech Stack</span>
            <div style={{ flex: 1, height: 1, background: '#1F2937', marginLeft: 16 }} />
          </div>

          <div className="grid-tech">
            {TECH_STACK.map(tech => (
              <div
                key={tech.name}
                className="card"
                style={{
                  height: 180,
                  padding: '28px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'border-color 0.15s ease',
                  cursor: 'default',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#374151')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#1F2937')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 28 }}>{tech.icon}</span>
                  <span style={{ fontSize: 17, fontWeight: 600, color: '#F9FAFB' }}>{tech.name}</span>
                </div>
                <p style={{ fontSize: 14, color: '#94A3B8', lineHeight: 1.6 }}>{tech.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 5 — IMPACT
          Full-width card, max 1200px, 64px padding
      ══════════════════════════════════════════════════════ */}
      <section id="impact" className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div
            className="card card-lg"
            style={{
              maxWidth: 1200,
              margin: '0 auto',
              padding: 64,
              textAlign: 'center',
            }}
          >
            <h2 style={{
              fontSize: 40,
              fontWeight: 700,
              color: '#F9FAFB',
              letterSpacing: '-0.025em',
              marginBottom: 20,
              lineHeight: 1.15,
            }}>
              Built for Smart Infrastructure
            </h2>
            <p style={{
              fontSize: 18,
              color: '#94A3B8',
              lineHeight: 1.75,
              maxWidth: 680,
              margin: '0 auto',
            }}>
              Designed for road monitoring, municipal infrastructure analysis, and predictive
              maintenance using edge AI. Enabling faster response times and safer transit
              routes through automated visual intelligence.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FOOTER — 48px padding, separated
      ══════════════════════════════════════════════════════ */}
      <footer style={{ borderTop: '1px solid #1F2937', marginTop: 40 }}>
        <div className="container" style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          paddingTop: 48,
          paddingBottom: 48,
        }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="16" height="16" viewBox="0 0 22 22" fill="none">
              <polygon points="11,1 21,21 1,21" stroke="#4B5563" strokeWidth="1.5" fill="none" />
            </svg>
            <span style={{ fontSize: 14, color: '#4B5563' }}>RoadGuard AI</span>
          </div>

          {/* Authors */}
          <span style={{ fontSize: 14, color: '#4B5563' }}>
            Built by Ronak, Pakshal, Shamit
          </span>

          {/* Links */}
          <div style={{ display: 'flex', gap: 28 }}>
            {[{ label: 'GitHub', href: 'https://github.com/ronakparmar11' }, { label: 'LinkedIn', href: 'https://www.linkedin.com/in/ronak-parmar-75b9422ba/' }].map(l => (
              <a
                key={l.label}
                href={l.href}
                style={{ fontSize: 14, color: '#4B5563', textDecoration: 'none', transition: 'color 0.15s ease' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#94A3B8')}
                onMouseLeave={e => (e.currentTarget.style.color = '#4B5563')}
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* Copyright */}
          <span style={{ fontSize: 14, color: '#4B5563' }}>© 2026 RoadGuard AI</span>
        </div>
      </footer>

    </div>
  );
};

export default App;
