'use client';

import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/Badge';

interface FindingRow {
  id: string;
  title: string;
  module: string;
  severity: string;
  effortTshirt: string;
  compositeScore: number;
  affectedCount: number;
  remediationDescription: string;
}

interface FindingsTableProps {
  findings: FindingRow[];
}

type SortKey = 'severity' | 'title' | 'module' | 'effortTshirt' | 'compositeScore' | 'affectedCount';
type SortDir = 'asc' | 'desc';

const severityOrder: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
};

const effortOrder: Record<string, number> = {
  XS: 1,
  S: 2,
  M: 3,
  L: 4,
  XL: 5,
};

function severityVariant(severity: string): 'critical' | 'high' | 'medium' | 'low' | 'info' | 'default' {
  if (['critical', 'high', 'medium', 'low', 'info'].includes(severity)) {
    return severity as 'critical' | 'high' | 'medium' | 'low' | 'info';
  }
  return 'default';
}

export function FindingsTable({ findings }: FindingsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('compositeScore');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    if (!filter) return findings;
    const lower = filter.toLowerCase();
    return findings.filter(
      (f) =>
        f.title.toLowerCase().includes(lower) ||
        f.module.toLowerCase().includes(lower) ||
        f.severity.toLowerCase().includes(lower)
    );
  }, [findings, filter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'severity':
          cmp = (severityOrder[a.severity] ?? 0) - (severityOrder[b.severity] ?? 0);
          break;
        case 'effortTshirt':
          cmp = (effortOrder[a.effortTshirt] ?? 0) - (effortOrder[b.effortTshirt] ?? 0);
          break;
        case 'title':
        case 'module':
          cmp = a[sortKey].localeCompare(b[sortKey]);
          break;
        default:
          cmp = a[sortKey] - b[sortKey];
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const columns: { key: SortKey; label: string }[] = [
    { key: 'severity', label: 'Severity' },
    { key: 'title', label: 'Title' },
    { key: 'module', label: 'Module' },
    { key: 'effortTshirt', label: 'Effort' },
    { key: 'compositeScore', label: 'Score' },
    { key: 'affectedCount', label: 'Affected' },
  ];

  return (
    <div className="bg-dark-gray rounded-xl overflow-hidden">
      {/* Search bar */}
      <div className="p-4 border-b border-obsidian">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-medium-gray"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            placeholder="Filter findings..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full rounded-lg bg-obsidian border border-medium-gray/30 pl-10 pr-4 py-2 text-sm text-white placeholder:text-medium-gray focus:outline-none focus:border-lime/50"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-obsidian">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="px-4 py-3 text-left text-xs font-mono uppercase tracking-wider text-medium-gray cursor-pointer hover:text-white select-none"
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key && (
                      <span className="text-lime">
                        {sortDir === 'asc' ? '\u2191' : '\u2193'}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((finding) => (
              <tr
                key={finding.id}
                className="border-b border-obsidian/50 hover:bg-obsidian/50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <Badge variant={severityVariant(finding.severity)}>
                    {finding.severity}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-white max-w-md">
                  <p className="truncate">{finding.title}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs uppercase text-medium-gray">
                    {finding.module}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="default">{finding.effortTshirt}</Badge>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-lime">
                    {finding.compositeScore.toFixed(1)}
                  </span>
                </td>
                <td className="px-4 py-3 text-medium-gray">
                  {finding.affectedCount}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-medium-gray">
                  No findings match your filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
