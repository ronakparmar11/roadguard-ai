import React from 'react';

interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  accent?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  accent = false,
}) => (
  <div
    className="card flex flex-col justify-between"
    style={{ height: 160, padding: '28px 32px' }}
  >
    <p style={{ fontSize: 13, fontWeight: 500, color: '#94A3B8', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
      {label}
    </p>
    <p
      className="metric-number"
      style={{ color: accent ? '#22D3EE' : '#F9FAFB' }}
    >
      {value}
      {unit && (
        <span style={{ fontSize: 20, fontWeight: 500, color: '#4B5563', marginLeft: 6 }}>
          {unit}
        </span>
      )}
    </p>
  </div>
);

interface DeviceStatusCardProps {
  device: string;
}

export const DeviceStatusCard: React.FC<DeviceStatusCardProps> = ({ device }) => (
  <div
    className="card flex flex-col justify-between"
    style={{ height: 160, padding: '28px 32px' }}
  >
    <p style={{ fontSize: 13, fontWeight: 500, color: '#94A3B8', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
      Device Status
    </p>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span
        className="pulse-dot"
        style={{
          display: 'inline-block',
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: '#22D3EE',
          flexShrink: 0,
        }}
      />
      <div>
        <span style={{ fontSize: 28, fontWeight: 700, color: '#F9FAFB', letterSpacing: '-0.02em' }}>
          {device}
        </span>
        <span style={{ fontSize: 16, fontWeight: 400, color: '#94A3B8', marginLeft: 8 }}>
          Active
        </span>
      </div>
    </div>
  </div>
);
