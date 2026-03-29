'use client';

import React from 'react';

interface HealthGaugeProps {
  score: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeConfig = {
  sm: { width: 100, strokeWidth: 8, fontSize: 'text-2xl', labelSize: 'text-xs' },
  md: { width: 160, strokeWidth: 10, fontSize: 'text-4xl', labelSize: 'text-sm' },
  lg: { width: 220, strokeWidth: 12, fontSize: 'text-5xl', labelSize: 'text-base' },
};

function getScoreColor(score: number): string {
  if (score >= 70) return '#CCFF00'; // lime
  if (score >= 40) return '#EAB308'; // yellow
  return '#EF4444'; // red
}

export function HealthGauge({ score, label, size = 'md' }: HealthGaugeProps) {
  const config = sizeConfig[size];
  const radius = (config.width - config.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = config.width / 2;

  // Arc goes from 135deg to 405deg (270deg sweep)
  const sweepAngle = 270;
  const arcLength = (sweepAngle / 360) * circumference;
  const filledLength = (Math.min(Math.max(score, 0), 100) / 100) * arcLength;
  const gapLength = arcLength - filledLength;
  const color = getScoreColor(score);

  // Rotate so arc starts at bottom-left (135deg from top = -225deg from right)
  const rotationOffset = 135;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: config.width, height: config.width }}>
        <svg
          width={config.width}
          height={config.width}
          viewBox={`0 0 ${config.width} ${config.width}`}
          className="transform"
        >
          {/* Background arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#2D2D3D"
            strokeWidth={config.strokeWidth}
            strokeDasharray={`${arcLength} ${circumference - arcLength}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            transform={`rotate(${rotationOffset} ${center} ${center})`}
          />
          {/* Filled arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={config.strokeWidth}
            strokeDasharray={`${filledLength} ${gapLength + (circumference - arcLength)}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            transform={`rotate(${rotationOffset} ${center} ${center})`}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        {/* Score text in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`font-heading font-bold ${config.fontSize}`}
            style={{ color }}
          >
            {score}
          </span>
        </div>
      </div>
      {label && (
        <span className={`text-medium-gray ${config.labelSize} mt-1`}>
          {label}
        </span>
      )}
    </div>
  );
}
