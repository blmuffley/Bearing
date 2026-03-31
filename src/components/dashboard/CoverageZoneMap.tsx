'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';

interface ZoneData {
  count: number;
  percent: number;
}

interface CoverageZoneMapProps {
  zones: {
    fully_covered: ZoneData;
    pathfinder_only: ZoneData;
    discovery_only: ZoneData;
    dark: ZoneData;
  };
  totalCIs: number;
  recommendations: string[];
}

const ZONE_CONFIG = [
  { key: 'fully_covered' as const, label: 'Fully Covered', color: '#CCFF00' },
  { key: 'pathfinder_only' as const, label: 'Pathfinder Only', color: '#3B82F6' },
  { key: 'discovery_only' as const, label: 'Discovery Only', color: '#EAB308' },
  { key: 'dark' as const, label: 'Dark', color: '#EF4444' },
] as const;

function getRecommendationLevel(text: string): 'critical' | 'warning' {
  const lower = text.toLowerCase();
  if (
    lower.includes('critical') ||
    lower.includes('no coverage') ||
    lower.includes('shadow') ||
    lower.includes('dark') ||
    lower.includes('deprecated')
  ) {
    return 'critical';
  }
  return 'warning';
}

export function CoverageZoneMap({ zones, totalCIs, recommendations }: CoverageZoneMapProps) {
  return (
    <Card title="Pathfinder Coverage Zones">
      {/* Total CI count */}
      <div className="mb-4">
        <span className="text-medium-gray text-sm">Total Configuration Items:</span>
        <span className="text-white font-mono text-lg ml-2">{totalCIs.toLocaleString()}</span>
      </div>

      {/* Stacked horizontal bar */}
      <div className="w-full h-10 rounded-lg overflow-hidden flex bg-obsidian">
        {ZONE_CONFIG.map(({ key, color }) => {
          const zone = zones[key];
          // Min width of 2% so tiny slices remain visible
          const width = zone.count > 0 ? Math.max(zone.percent, 2) : 0;
          if (width === 0) return null;
          return (
            <div
              key={key}
              className="h-full transition-all duration-500 ease-out relative group"
              style={{ width: `${width}%`, backgroundColor: color }}
            >
              {/* Percentage label inside bar when large enough */}
              {zone.percent >= 8 && (
                <span className="absolute inset-0 flex items-center justify-center text-xs font-mono font-bold text-obsidian">
                  {zone.percent.toFixed(0)}%
                </span>
              )}
              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-obsidian rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-medium-gray/30">
                {zone.count} CIs ({zone.percent.toFixed(1)}%)
              </div>
            </div>
          );
        })}
        {/* Fallback if all zones are zero */}
        {totalCIs === 0 && (
          <div className="h-full w-full bg-medium-gray/30 flex items-center justify-center">
            <span className="text-xs text-medium-gray">No data</span>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        {ZONE_CONFIG.map(({ key, label, color }) => {
          const zone = zones[key];
          return (
            <div key={key} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <div className="min-w-0">
                <p className="text-white text-sm truncate">{label}</p>
                <p className="text-medium-gray text-xs font-mono">
                  {zone.count.toLocaleString()} ({zone.percent.toFixed(1)}%)
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="mt-6 space-y-2">
          <h4 className="text-sm font-semibold text-white mb-2">Recommendations</h4>
          {recommendations.map((rec, i) => {
            const level = getRecommendationLevel(rec);
            const borderColor = level === 'critical' ? 'border-red-500' : 'border-yellow-500';
            const iconColor = level === 'critical' ? 'text-red-400' : 'text-yellow-400';
            return (
              <div
                key={i}
                className={`flex items-start gap-2 border-l-2 ${borderColor} bg-obsidian/50 rounded-r-lg px-3 py-2`}
              >
                <svg
                  className={`w-4 h-4 mt-0.5 flex-shrink-0 ${iconColor}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
                <p className="text-sm text-medium-gray">{rec}</p>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
