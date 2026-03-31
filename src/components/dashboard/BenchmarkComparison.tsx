'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface BenchmarkData {
  cohortSize: number;
  avgScore: number;
  medianScore: number;
  p25Score: number;
  p75Score: number;
  industryVertical?: string;
  companySizeTier?: string;
}

interface BenchmarkComparisonProps {
  currentScore: number;
  benchmarks: BenchmarkData | null;
}

const BAR_WIDTH = 600;
const BAR_HEIGHT = 60;
const BAR_Y = 10;
const TRACK_HEIGHT = 24;

function scoreToX(score: number): number {
  return (score / 100) * BAR_WIDTH;
}

function computePercentile(score: number, benchmarks: BenchmarkData): number {
  const { p25Score, medianScore, p75Score } = benchmarks;
  if (score <= p25Score) {
    return Math.round((score / p25Score) * 25);
  }
  if (score <= medianScore) {
    return 25 + Math.round(((score - p25Score) / (medianScore - p25Score)) * 25);
  }
  if (score <= p75Score) {
    return 50 + Math.round(((score - medianScore) / (p75Score - medianScore)) * 25);
  }
  return 75 + Math.round(((score - p75Score) / (100 - p75Score)) * 25);
}

export function BenchmarkComparison({ currentScore, benchmarks }: BenchmarkComparisonProps) {
  if (!benchmarks) {
    return (
      <Card title="Peer Benchmark">
        <div className="flex flex-col items-center justify-center h-40 gap-3">
          <svg className="h-10 w-10 text-medium-gray" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          <p className="text-medium-gray text-sm text-center max-w-sm">
            Insufficient benchmark data. Minimum 10 assessments required for peer comparison.
          </p>
        </div>
      </Card>
    );
  }

  const { cohortSize, avgScore, medianScore, p25Score, p75Score, industryVertical, companySizeTier } = benchmarks;
  const percentile = computePercentile(currentScore, benchmarks);
  const aboveMedian = currentScore >= medianScore;
  const diff = Math.abs(currentScore - medianScore);

  return (
    <Card title="Peer Benchmark">
      <div className="space-y-5">
        {/* Distribution bar */}
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${BAR_WIDTH} ${BAR_HEIGHT + 30}`} className="w-full" style={{ minWidth: 360 }}>
            {/* Background track */}
            <rect
              x={0}
              y={BAR_Y}
              width={BAR_WIDTH}
              height={TRACK_HEIGHT}
              rx={4}
              fill="#2D2D3D"
            />

            {/* P25-P75 interquartile range band */}
            <rect
              x={scoreToX(p25Score)}
              y={BAR_Y}
              width={scoreToX(p75Score) - scoreToX(p25Score)}
              height={TRACK_HEIGHT}
              rx={4}
              fill="rgba(204,255,0,0.12)"
            />

            {/* P25 label */}
            <line x1={scoreToX(p25Score)} y1={BAR_Y} x2={scoreToX(p25Score)} y2={BAR_Y + TRACK_HEIGHT} stroke="#6B6B7B" strokeWidth={1} />
            <text x={scoreToX(p25Score)} y={BAR_Y + TRACK_HEIGHT + 14} textAnchor="middle" fill="#6B6B7B" fontSize={10} fontFamily="DM Sans, sans-serif">
              P25: {p25Score}
            </text>

            {/* Median line */}
            <line x1={scoreToX(medianScore)} y1={BAR_Y - 4} x2={scoreToX(medianScore)} y2={BAR_Y + TRACK_HEIGHT + 4} stroke="white" strokeWidth={2} />
            <text x={scoreToX(medianScore)} y={BAR_Y + TRACK_HEIGHT + 14} textAnchor="middle" fill="white" fontSize={10} fontWeight="600" fontFamily="DM Sans, sans-serif">
              Med: {medianScore}
            </text>

            {/* P75 label */}
            <line x1={scoreToX(p75Score)} y1={BAR_Y} x2={scoreToX(p75Score)} y2={BAR_Y + TRACK_HEIGHT} stroke="#6B6B7B" strokeWidth={1} />
            <text x={scoreToX(p75Score)} y={BAR_Y + TRACK_HEIGHT + 14} textAnchor="middle" fill="#6B6B7B" fontSize={10} fontFamily="DM Sans, sans-serif">
              P75: {p75Score}
            </text>

            {/* Average marker */}
            <circle cx={scoreToX(avgScore)} cy={BAR_Y + TRACK_HEIGHT / 2} r={4} fill="#6B6B7B" stroke="#1A1A2E" strokeWidth={1} />
            <text x={scoreToX(avgScore)} y={BAR_Y + TRACK_HEIGHT + 26} textAnchor="middle" fill="#6B6B7B" fontSize={9} fontFamily="DM Sans, sans-serif">
              Avg: {avgScore}
            </text>

            {/* Current score marker */}
            <line x1={scoreToX(currentScore)} y1={BAR_Y - 6} x2={scoreToX(currentScore)} y2={BAR_Y + TRACK_HEIGHT + 6} stroke="#CCFF00" strokeWidth={3} strokeLinecap="round" />
            <circle cx={scoreToX(currentScore)} cy={BAR_Y + TRACK_HEIGHT / 2} r={6} fill="#CCFF00" stroke="#1A1A2E" strokeWidth={2} />
            <text x={scoreToX(currentScore)} y={BAR_Y - 10} textAnchor="middle" fill="#CCFF00" fontSize={12} fontWeight="700" fontFamily="Syne, sans-serif">
              {currentScore}
            </text>
          </svg>
        </div>

        {/* Summary text */}
        <div className="space-y-2">
          <p className="text-white text-sm">
            Your score of{' '}
            <span className="font-semibold" style={{ color: '#CCFF00' }}>{currentScore}</span>
            {' '}is{' '}
            <span className={aboveMedian ? 'text-green-400' : 'text-red-400'}>
              {diff} points {aboveMedian ? 'above' : 'below'}
            </span>
            {' '}the peer median of {medianScore}.
          </p>

          <p className="text-sm" style={{ color: '#CCFF00' }}>
            Better than {percentile}% of peers
          </p>
        </div>

        {/* Cohort info */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-medium-gray text-xs">
            Based on {cohortSize} assessments
          </span>
          {industryVertical && (
            <Badge variant="default">{industryVertical}</Badge>
          )}
          {companySizeTier && (
            <Badge variant="default">{companySizeTier}</Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
