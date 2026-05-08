import React, { useCallback, useRef, useState } from 'react';

interface VideoDropZoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export const VideoDropZone: React.FC<VideoDropZoneProps> = ({ onFile, disabled = false }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = useCallback(
    (file: File | undefined) => { if (!file || disabled) return; onFile(file); },
    [onFile, disabled],
  );

  const handleDragOver  = (e: React.DragEvent) => { e.preventDefault(); if (!disabled) setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop      = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); processFile(e.dataTransfer.files[0]); };
  const handleChange    = (e: React.ChangeEvent<HTMLInputElement>) => { processFile(e.target.files?.[0]); e.target.value = ''; };
  const handleClick     = () => { if (!disabled) inputRef.current?.click(); };

  return (
    <div
      id="video-drop-zone"
      role="button"
      tabIndex={0}
      aria-label="Upload video for pothole detection"
      onClick={handleClick}
      onKeyDown={e => e.key === 'Enter' && handleClick()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={isDragging ? 'drop-zone-active' : ''}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        borderRadius: 14,
        border: '1.5px dashed',
        borderColor: isDragging ? '#A78BFA' : '#1F2937',
        background: isDragging ? 'rgba(167,139,250,0.06)' : 'transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        userSelect: 'none',
        transition: 'border-color 0.15s ease, background 0.15s ease',
        minHeight: 220,
        width: '100%',
        padding: '32px 24px',
      }}
    >
      {/* Icon circle */}
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: '#1F2937',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <svg width="26" height="26" fill="none" stroke="#A78BFA" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
          />
        </svg>
      </div>

      {/* Text */}
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 16, fontWeight: 500, color: '#F9FAFB', marginBottom: 6 }}>
          Drop your video here
        </p>
        <p style={{ fontSize: 14, color: '#94A3B8' }}>
          or{' '}
          <span style={{ color: '#A78BFA', fontWeight: 500 }}>browse files</span>
        </p>
        <p style={{ fontSize: 12, color: '#4B5563', marginTop: 8 }}>
          MP4 supported
        </p>
      </div>

      <input
        ref={inputRef}
        id="video-file-input"
        type="file"
        accept=".mp4,video/mp4"
        style={{ display: 'none' }}
        onChange={handleChange}
        disabled={disabled}
      />
    </div>
  );
};
