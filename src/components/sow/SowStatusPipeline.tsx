'use client';

import React from 'react';

interface SowPipelineItem {
  id: string;
  status: string;
  customerName: string;
  engagementType: string;
  totalRevenueLow: number;
  totalRevenueHigh: number;
  createdAt: string;
}

interface SowStatusPipelineProps {
  sows: SowPipelineItem[];
}

const columns: { key: string; label: string; color: string; bgColor: string; borderColor: string }[] = [
  { key: 'draft', label: 'Draft', color: 'text-medium-gray', bgColor: 'bg-medium-gray/10', borderColor: 'border-medium-gray/30' },
  { key: 'sent', label: 'Sent', color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
  { key: 'under_review', label: 'Under Review', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/30' },
  { key: 'accepted', label: 'Accepted', color: 'text-lime', bgColor: 'bg-lime/10', borderColor: 'border-lime/30' },
  { key: 'declined', label: 'Declined', color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30' },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatEngagementType(type: string): string {
  const labels: Record<string, string> = {
    time_and_materials: 'T&M',
    fixed_fee: 'Fixed Fee',
    blended: 'Blended',
  };
  return labels[type] ?? type;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function SowStatusPipeline({ sows }: SowStatusPipelineProps) {
  const grouped = columns.reduce<Record<string, SowPipelineItem[]>>((acc, col) => {
    acc[col.key] = sows.filter((s) => s.status === col.key);
    return acc;
  }, {});

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((col) => {
        const items = grouped[col.key] ?? [];
        return (
          <div key={col.key} className="flex-shrink-0 w-64">
            {/* Column header */}
            <div className={`flex items-center justify-between rounded-t-lg px-3 py-2 ${col.bgColor} border ${col.borderColor} border-b-0`}>
              <span className={`text-sm font-semibold ${col.color}`}>
                {col.label}
              </span>
              <span className={`text-xs font-mono ${col.color}`}>
                {items.length}
              </span>
            </div>

            {/* Column body */}
            <div className={`min-h-[200px] rounded-b-lg border ${col.borderColor} border-t-0 bg-obsidian/50 p-2 space-y-2`}>
              {items.length === 0 && (
                <p className="text-xs text-medium-gray text-center py-8">
                  No SOWs
                </p>
              )}
              {items.map((sow) => (
                <div
                  key={sow.id}
                  className="bg-dark-gray rounded-lg p-3 space-y-2 hover:bg-dark-gray/80 transition-colors"
                >
                  <p className="text-sm font-medium text-white truncate">
                    {sow.customerName}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-medium-gray">
                      {formatEngagementType(sow.engagementType)}
                    </span>
                    <span className="text-xs font-mono text-medium-gray">
                      {formatDate(sow.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-lime">
                    {formatCurrency(sow.totalRevenueLow)} &ndash; {formatCurrency(sow.totalRevenueHigh)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
