'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';

interface RevenueSummaryProps {
  totalRevenueLow: number;
  totalRevenueHigh: number;
  totalHoursLow: number;
  totalHoursHigh: number;
  quickWinCount: number;
  quickWinRevenue: number;
}

const fmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const numFmt = new Intl.NumberFormat('en-US');

export function RevenueSummary({
  totalRevenueLow,
  totalRevenueHigh,
  totalHoursLow,
  totalHoursHigh,
  quickWinCount,
  quickWinRevenue,
}: RevenueSummaryProps) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <p className="text-medium-gray text-sm uppercase tracking-wider mb-2">
          Total Addressable Remediation Revenue
        </p>
        <p className="font-heading text-3xl lg:text-4xl font-bold text-lime">
          {fmt.format(totalRevenueLow)} &mdash; {fmt.format(totalRevenueHigh)}
        </p>
        <p className="text-medium-gray text-sm mt-3">
          {numFmt.format(totalHoursLow)} &ndash; {numFmt.format(totalHoursHigh)} estimated hours
        </p>
      </Card>

      <Card className="border border-lime/20">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-lime/10">
            <svg
              className="h-5 w-5 text-lime"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm text-medium-gray">Quick Wins</p>
            <p className="font-heading text-xl font-bold text-white">
              {quickWinCount} findings &middot;{' '}
              <span className="text-lime">{fmt.format(quickWinRevenue)}</span>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
