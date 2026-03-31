'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';

interface TrendDataPoint {
  date: string;
  healthScore: number;
  findingCount: number;
  criticalCount: number;
}

interface TrendChartProps {
  dataPoints: TrendDataPoint[];
}

const CHART_WIDTH = 700;
const CHART_HEIGHT = 300;
const PADDING = { top: 20, right: 30, bottom: 50, left: 45 };
const INNER_WIDTH = CHART_WIDTH - PADDING.left - PADDING.right;
const INNER_HEIGHT = CHART_HEIGHT - PADDING.top - PADDING.bottom;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function TrendChart({ dataPoints }: TrendChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (dataPoints.length === 0) {
    return (
      <Card title="Health Score Trend">
        <div className="flex items-center justify-center h-48 text-medium-gray text-sm">
          No assessment data available yet.
        </div>
      </Card>
    );
  }

  if (dataPoints.length === 1) {
    const pt = dataPoints[0];
    return (
      <Card title="Health Score Trend">
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <div className="flex items-center gap-2">
            <span className="text-3xl font-heading font-bold" style={{ color: '#CCFF00' }}>
              {pt.healthScore}
            </span>
            <span className="text-medium-gray text-sm">on {formatDate(pt.date)}</span>
          </div>
          <p className="text-medium-gray text-sm">
            Run more assessments to see trends
          </p>
        </div>
      </Card>
    );
  }

  // Compute positions
  const xScale = (i: number) => PADDING.left + (i / (dataPoints.length - 1)) * INNER_WIDTH;
  const yScale = (v: number) => PADDING.top + INNER_HEIGHT - (v / 100) * INNER_HEIGHT;

  // Build line path
  const linePath = dataPoints
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(pt.healthScore)}`)
    .join(' ');

  // Grid lines at 25, 50, 75
  const gridLevels = [25, 50, 75];

  // Zone backgrounds
  const zones = [
    { y1: yScale(100), y2: yScale(70), fill: 'rgba(34,197,94,0.04)' },  // green zone 70-100
    { y1: yScale(70), y2: yScale(40), fill: 'rgba(234,179,8,0.04)' },   // yellow zone 40-70
    { y1: yScale(40), y2: yScale(0), fill: 'rgba(239,68,68,0.04)' },    // red zone 0-40
  ];

  return (
    <Card title="Health Score Trend">
      <div className="relative overflow-x-auto">
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="w-full"
          style={{ minWidth: 400 }}
        >
          {/* Zone backgrounds */}
          {zones.map((zone, i) => (
            <rect
              key={i}
              x={PADDING.left}
              y={zone.y1}
              width={INNER_WIDTH}
              height={zone.y2 - zone.y1}
              fill={zone.fill}
            />
          ))}

          {/* Grid lines */}
          {gridLevels.map((level) => (
            <g key={level}>
              <line
                x1={PADDING.left}
                y1={yScale(level)}
                x2={PADDING.left + INNER_WIDTH}
                y2={yScale(level)}
                stroke="#6B6B7B"
                strokeWidth={0.5}
                strokeDasharray="4 4"
                opacity={0.4}
              />
              <text
                x={PADDING.left - 8}
                y={yScale(level) + 4}
                textAnchor="end"
                fill="#6B6B7B"
                fontSize={11}
                fontFamily="DM Sans, sans-serif"
              >
                {level}
              </text>
            </g>
          ))}

          {/* Y-axis labels at 0 and 100 */}
          <text
            x={PADDING.left - 8}
            y={yScale(0) + 4}
            textAnchor="end"
            fill="#6B6B7B"
            fontSize={11}
            fontFamily="DM Sans, sans-serif"
          >
            0
          </text>
          <text
            x={PADDING.left - 8}
            y={yScale(100) + 4}
            textAnchor="end"
            fill="#6B6B7B"
            fontSize={11}
            fontFamily="DM Sans, sans-serif"
          >
            100
          </text>

          {/* X-axis labels */}
          {dataPoints.map((pt, i) => (
            <text
              key={i}
              x={xScale(i)}
              y={CHART_HEIGHT - 10}
              textAnchor="middle"
              fill="#6B6B7B"
              fontSize={10}
              fontFamily="DM Sans, sans-serif"
              transform={dataPoints.length > 6 ? `rotate(-30 ${xScale(i)} ${CHART_HEIGHT - 10})` : undefined}
            >
              {formatDate(pt.date)}
            </text>
          ))}

          {/* Area fill under line */}
          <path
            d={`${linePath} L ${xScale(dataPoints.length - 1)} ${yScale(0)} L ${xScale(0)} ${yScale(0)} Z`}
            fill="#CCFF00"
            opacity={0.06}
          />

          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#CCFF00"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Data points */}
          {dataPoints.map((pt, i) => (
            <g key={i}>
              <circle
                cx={xScale(i)}
                cy={yScale(pt.healthScore)}
                r={hoveredIndex === i ? 6 : 4}
                fill={hoveredIndex === i ? '#CCFF00' : '#1A1A2E'}
                stroke="#CCFF00"
                strokeWidth={2}
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
              {/* Invisible larger hit area */}
              <circle
                cx={xScale(i)}
                cy={yScale(pt.healthScore)}
                r={16}
                fill="transparent"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            </g>
          ))}

          {/* Tooltip */}
          {hoveredIndex !== null && (() => {
            const pt = dataPoints[hoveredIndex];
            const tx = xScale(hoveredIndex);
            const ty = yScale(pt.healthScore);
            const tooltipWidth = 170;
            const tooltipHeight = 80;
            // Flip tooltip if too close to right edge
            const flipX = tx + tooltipWidth + 10 > CHART_WIDTH;
            const tooltipX = flipX ? tx - tooltipWidth - 10 : tx + 10;
            const tooltipY = Math.max(PADDING.top, ty - tooltipHeight / 2);

            return (
              <g>
                <rect
                  x={tooltipX}
                  y={tooltipY}
                  width={tooltipWidth}
                  height={tooltipHeight}
                  rx={8}
                  fill="#1A1A2E"
                  stroke="#2D2D3D"
                  strokeWidth={1}
                />
                <text x={tooltipX + 10} y={tooltipY + 20} fill="#CCFF00" fontSize={12} fontWeight="600" fontFamily="Syne, sans-serif">
                  Score: {pt.healthScore}
                </text>
                <text x={tooltipX + 10} y={tooltipY + 38} fill="white" fontSize={11} fontFamily="DM Sans, sans-serif">
                  {formatDate(pt.date)}
                </text>
                <text x={tooltipX + 10} y={tooltipY + 54} fill="#6B6B7B" fontSize={11} fontFamily="DM Sans, sans-serif">
                  Findings: {pt.findingCount}
                </text>
                <text x={tooltipX + 10} y={tooltipY + 70} fill="#EF4444" fontSize={11} fontFamily="DM Sans, sans-serif">
                  Critical: {pt.criticalCount}
                </text>
              </g>
            );
          })()}
        </svg>
      </div>
    </Card>
  );
}
