'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';

interface CalibrationFactor {
  patternKey: string;
  displayName: string;
  factor: number;
  sampleSize: number;
  avgAccuracy: number;
}

interface CalibrationInsightsProps {
  factors: CalibrationFactor[];
}

function FactorDisplay({ factor }: { factor: number }) {
  let color = '#6B6B7B'; // neutral
  if (factor > 1.15) color = '#EAB308';  // yellow - estimates too low
  else if (factor < 0.9) color = '#22C55E'; // green - estimates too high (over-estimated)

  return (
    <span className="font-mono text-sm font-semibold" style={{ color }}>
      {factor.toFixed(1)}x
    </span>
  );
}

function AccuracyBar({ accuracy }: { accuracy: number }) {
  const clamped = Math.min(100, Math.max(0, accuracy));
  let color = '#EF4444';
  if (clamped >= 80) color = '#CCFF00';
  else if (clamped >= 60) color = '#EAB308';

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-dark-gray rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs text-medium-gray font-mono">{Math.round(clamped)}%</span>
    </div>
  );
}

export function CalibrationInsights({ factors }: CalibrationInsightsProps) {
  // Only show patterns with sufficient sample size
  const qualifiedFactors = factors.filter((f) => f.sampleSize >= 3);

  if (qualifiedFactors.length === 0) {
    return (
      <Card title="Calibration Insights">
        <div className="flex items-center justify-center h-32">
          <p className="text-medium-gray text-sm text-center max-w-sm">
            Insufficient calibration data. Complete more engagements to see estimation accuracy patterns.
          </p>
        </div>
      </Card>
    );
  }

  const overallAccuracy =
    qualifiedFactors.reduce((sum, f) => sum + f.avgAccuracy, 0) / qualifiedFactors.length;

  return (
    <Card title="Calibration Insights">
      <div className="space-y-4">
        {/* Overall stat */}
        <div className="flex items-center gap-3 pb-3 border-b border-dark-gray">
          <span className="text-medium-gray text-sm">Overall estimation accuracy:</span>
          <span
            className="font-heading font-bold text-lg"
            style={{ color: overallAccuracy >= 80 ? '#CCFF00' : overallAccuracy >= 60 ? '#EAB308' : '#EF4444' }}
          >
            {Math.round(overallAccuracy)}%
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-medium-gray text-xs uppercase tracking-wider">
                <th className="text-left py-2 pr-4 font-medium">Pattern</th>
                <th className="text-right py-2 px-4 font-medium">Factor</th>
                <th className="text-right py-2 px-4 font-medium">Samples</th>
                <th className="text-left py-2 pl-4 font-medium">Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {qualifiedFactors.map((f) => (
                <tr key={f.patternKey} className="border-t border-dark-gray/50">
                  <td className="py-2.5 pr-4 text-white">{f.displayName}</td>
                  <td className="py-2.5 px-4 text-right">
                    <FactorDisplay factor={f.factor} />
                  </td>
                  <td className="py-2.5 px-4 text-right text-medium-gray font-mono">{f.sampleSize}</td>
                  <td className="py-2.5 pl-4">
                    <AccuracyBar accuracy={f.avgAccuracy} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 pt-2 text-xs text-medium-gray">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-yellow-500" />
            &gt;1.1x = estimates too low
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
            &lt;0.9x = estimates too high
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: '#6B6B7B' }} />
            ~1.0x = well calibrated
          </span>
        </div>
      </div>
    </Card>
  );
}
