import React, { useCallback, useRef, useState } from 'react';
import { ACCEPTED_EXTENSIONS } from '../config';

interface DropZoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({ onFile, disabled = false }) => {
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
      id="drop-zone"
      role="button"
      tabIndex={0}
      aria-label="Upload image for pothole detection"
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
        borderColor: isDragging ? '#22D3EE' : '#1F2937',
        background: isDragging ? 'rgba(34,211,238,0.06)' : 'transparent',
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
        <svg width="26" height="26" fill="none" stroke="#94A3B8" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
          />
        </svg>
      </div>

      {/* Text */}
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 16, fontWeight: 500, color: '#F9FAFB', marginBottom: 6 }}>
          Drop your image here
        </p>
        <p style={{ fontSize: 14, color: '#94A3B8' }}>
          or{' '}
          <span style={{ color: '#22D3EE', fontWeight: 500 }}>browse files</span>
        </p>
        <p style={{ fontSize: 12, color: '#4B5563', marginTop: 8 }}>
          JPG &amp; PNG supported
        </p>
      </div>

      <input
        ref={inputRef}
        id="file-input"
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        style={{ display: 'none' }}
        onChange={handleChange}
        disabled={disabled}
      />
    </div>
  );
};
