'use client';

import React, { useState, useTransition } from 'react';

interface SowRow {
  id: string;
  status: string;
  engagement_type: string;
  total_hours_low: number | null;
  total_hours_high: number | null;
  total_revenue_low: number | null;
  total_revenue_high: number | null;
  document_url: string | null;
  created_at: string;
}

interface SowTrackingListProps {
  sows: SowRow[];
  assessmentId: string;
}

const statusConfig: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  draft: { label: 'Draft', bg: 'bg-medium-gray/20', text: 'text-medium-gray' },
  sent: { label: 'Sent', bg: 'bg-blue-500/20', text: 'text-blue-400' },
  under_review: {
    label: 'Under Review',
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-400',
  },
  accepted: { label: 'Accepted', bg: 'bg-lime/20', text: 'text-lime' },
  declined: { label: 'Declined', bg: 'bg-red-500/20', text: 'text-red-400' },
};

const engagementLabels: Record<string, string> = {
  time_and_materials: 'T&M',
  fixed_fee: 'Fixed Fee',
  blended: 'Blended',
};

const statusTransitions: string[] = [
  'draft',
  'sent',
  'under_review',
  'accepted',
  'declined',
];

function formatCurrency(value: number | null): string {
  if (value == null) return '--';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function SowTrackingList({ sows: initialSows, assessmentId }: SowTrackingListProps) {
  const [sows, setSows] = useState(initialSows);
  const [isPending, startTransition] = useTransition();

  async function handleStatusChange(sowId: string, newStatus: string) {
    // Optimistic update
    setSows((prev) =>
      prev.map((s) => (s.id === sowId ? { ...s, status: newStatus } : s))
    );

    try {
      const res = await fetch('/api/trpc/sow.updateStatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json: { id: sowId, status: newStatus } }),
      });
      if (!res.ok) {
        // Revert on failure
        setSows(initialSows);
      }
    } catch {
      setSows(initialSows);
    }
  }

  return (
    <div className="bg-dark-gray rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-medium-gray/20">
            <th className="text-left text-xs font-medium text-medium-gray px-4 py-3 uppercase tracking-wider">
              Date
            </th>
            <th className="text-left text-xs font-medium text-medium-gray px-4 py-3 uppercase tracking-wider">
              Type
            </th>
            <th className="text-left text-xs font-medium text-medium-gray px-4 py-3 uppercase tracking-wider">
              Status
            </th>
            <th className="text-left text-xs font-medium text-medium-gray px-4 py-3 uppercase tracking-wider">
              Hours
            </th>
            <th className="text-left text-xs font-medium text-medium-gray px-4 py-3 uppercase tracking-wider">
              Revenue
            </th>
            <th className="text-right text-xs font-medium text-medium-gray px-4 py-3 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-medium-gray/10">
          {sows.map((sow) => {
            const status = statusConfig[sow.status] ?? statusConfig.draft;
            return (
              <tr key={sow.id} className="hover:bg-obsidian/30 transition-colors">
                {/* Date */}
                <td className="px-4 py-3 text-sm text-white font-mono">
                  {formatDate(sow.created_at)}
                </td>

                {/* Engagement Type */}
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full bg-dark-gray border border-medium-gray/20 px-2.5 py-0.5 text-xs font-medium text-white">
                    {engagementLabels[sow.engagement_type] ?? sow.engagement_type}
                  </span>
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.bg} ${status.text}`}
                  >
                    {status.label}
                  </span>
                </td>

                {/* Hours */}
                <td className="px-4 py-3 text-sm font-mono text-white">
                  {sow.total_hours_low != null && sow.total_hours_high != null
                    ? `${sow.total_hours_low} - ${sow.total_hours_high}`
                    : '--'}
                </td>

                {/* Revenue */}
                <td className="px-4 py-3 text-sm font-mono text-lime">
                  {sow.total_revenue_low != null && sow.total_revenue_high != null
                    ? `${formatCurrency(sow.total_revenue_low)} - ${formatCurrency(sow.total_revenue_high)}`
                    : '--'}
                </td>

                {/* Actions */}
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {/* Download button */}
                    {sow.document_url && (
                      <a
                        href={sow.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md bg-obsidian px-2 py-1 text-xs text-medium-gray hover:text-white transition-colors"
                        title="Download SOW"
                      >
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                          />
                        </svg>
                        Download
                      </a>
                    )}

                    {/* Status dropdown */}
                    <select
                      value={sow.status}
                      onChange={(e) => handleStatusChange(sow.id, e.target.value)}
                      className="rounded-md bg-obsidian border border-medium-gray/20 px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-lime"
                    >
                      {statusTransitions.map((s) => (
                        <option key={s} value={s}>
                          {statusConfig[s]?.label ?? s}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
