'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';

interface PathfinderInsightsProps {
  fusionFindingCount: number;
  totalPathfinderCIs: number;
  activeCIs: number;
  idleCIs: number;
  deprecatedCIs: number;
  shadowITCount: number;
  misclassifiedCount: number;
  hasPathfinderData: boolean;
}

interface StatCardProps {
  label: string;
  value: number;
  accentColor: string;
  subtitle?: string;
  critical?: boolean;
}

function StatCard({ label, value, accentColor, subtitle, critical }: StatCardProps) {
  return (
    <div
      className={`bg-obsidian rounded-lg p-4 border ${
        critical && value > 0 ? 'border-red-500/50' : 'border-medium-gray/20'
      }`}
    >
      <p className="text-medium-gray text-xs uppercase tracking-wider font-mono mb-1">
        {label}
      </p>
      <p
        className="text-2xl font-bold font-heading"
        style={{ color: critical && value > 0 ? '#EF4444' : accentColor }}
      >
        {value.toLocaleString()}
      </p>
      {subtitle && (
        <p className="text-medium-gray text-xs mt-1">{subtitle}</p>
      )}
    </div>
  );
}

export function PathfinderInsights({
  fusionFindingCount,
  totalPathfinderCIs,
  activeCIs,
  idleCIs,
  deprecatedCIs,
  shadowITCount,
  misclassifiedCount,
  hasPathfinderData,
}: PathfinderInsightsProps) {
  if (!hasPathfinderData) {
    return (
      <div className="border border-medium-gray/30 rounded-xl p-6 bg-dark-gray">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-medium-gray mt-0.5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
            />
          </svg>
          <div>
            <h3 className="text-white font-heading font-semibold text-lg">
              Pathfinder data not available
            </h3>
            <p className="text-medium-gray text-sm mt-1">
              Deploy Pathfinder agents to get behavioral confidence data that enriches your
              assessment. Pathfinder observes real network traffic to validate CMDB accuracy,
              detect shadow IT, and identify misclassified configuration items.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card title="Pathfinder Insights">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          label="Total Monitored CIs"
          value={totalPathfinderCIs}
          accentColor="#FFFFFF"
        />
        <StatCard
          label="Active CIs"
          value={activeCIs}
          accentColor="#22C55E"
        />
        <StatCard
          label="Idle CIs"
          value={idleCIs}
          accentColor="#EAB308"
        />
        <StatCard
          label="Fusion Findings"
          value={fusionFindingCount}
          accentColor="#CCFF00"
          subtitle="Findings only detectable with Pathfinder"
        />
        <StatCard
          label="Shadow IT Alerts"
          value={shadowITCount}
          accentColor="#EF4444"
          critical={true}
        />
        <StatCard
          label="Misclassified CIs"
          value={misclassifiedCount}
          accentColor="#F97316"
        />
      </div>
    </Card>
  );
}
