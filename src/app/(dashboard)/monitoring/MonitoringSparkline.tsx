'use client';

import React from 'react';

interface MonitoringSparklineProps {
  points: number[];
}

const WIDTH = 96;
const HEIGHT = 32;
const PADDING = 2;

export function MonitoringSparkline({ points }: MonitoringSparklineProps) {
  if (points.length < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const xStep = (WIDTH - PADDING * 2) / (points.length - 1);

  const pathData = points
    .map((val, i) => {
      const x = PADDING + i * xStep;
      const y = PADDING + (HEIGHT - PADDING * 2) - ((val - min) / range) * (HEIGHT - PADDING * 2);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  // Determine color based on trend (last vs first)
  const trend = points[points.length - 1] - points[0];
  const color = trend >= 0 ? '#CCFF00' : '#EF4444';

  return (
    <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
      <path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last point dot */}
      <circle
        cx={PADDING + (points.length - 1) * xStep}
        cy={PADDING + (HEIGHT - PADDING * 2) - ((points[points.length - 1] - min) / range) * (HEIGHT - PADDING * 2)}
        r={2.5}
        fill={color}
      />
    </svg>
  );
}
