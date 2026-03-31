'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';

interface Alert {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  currentValue: number;
  previousValue?: number;
  delta?: number;
}

interface AlertsPanelProps {
  alerts: Alert[];
}

const severityStyles: Record<string, { border: string; bg: string; icon: string }> = {
  critical: { border: 'border-red-500', bg: 'bg-red-500/5', icon: 'text-red-400' },
  warning: { border: 'border-yellow-500', bg: 'bg-yellow-500/5', icon: 'text-yellow-400' },
  info: { border: 'border-blue-500', bg: 'bg-blue-500/5', icon: 'text-blue-400' },
};

function AlertIcon({ type, severity }: { type: string; severity: string }) {
  const colorClass = severityStyles[severity]?.icon ?? 'text-medium-gray';

  if (type === 'score_drop' || type === 'health_decrease') {
    return (
      <svg className={`h-5 w-5 ${colorClass} flex-shrink-0`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
      </svg>
    );
  }

  if (type === 'score_improvement' || type === 'health_increase') {
    return (
      <svg className={`h-5 w-5 ${colorClass} flex-shrink-0`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
      </svg>
    );
  }

  // Default: exclamation for new criticals, etc.
  return (
    <svg className={`h-5 w-5 ${colorClass} flex-shrink-0`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function DeltaDisplay({ delta }: { delta: number }) {
  if (delta === 0) return null;
  const isPositive = delta > 0;
  return (
    <span className={`text-sm font-mono font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
      {isPositive ? '+' : ''}{delta}
    </span>
  );
}

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  if (alerts.length === 0) {
    return (
      <Card title="Monitoring Alerts">
        <div className="flex items-center justify-center h-32 gap-3">
          <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-medium-gray text-sm">
            No alerts. Your instance health is stable.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Monitoring Alerts">
      <div className="space-y-3">
        {alerts.map((alert, i) => {
          const styles = severityStyles[alert.severity] ?? severityStyles.info;
          return (
            <div
              key={i}
              className={`flex items-start gap-3 rounded-lg border-l-4 ${styles.border} ${styles.bg} px-4 py-3`}
            >
              <AlertIcon type={alert.type} severity={alert.severity} />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm">{alert.message}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-medium-gray text-xs">
                    Current: {alert.currentValue}
                  </span>
                  {alert.previousValue !== undefined && (
                    <span className="text-medium-gray text-xs">
                      Previous: {alert.previousValue}
                    </span>
                  )}
                </div>
              </div>
              {alert.delta !== undefined && (
                <DeltaDisplay delta={alert.delta} />
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
