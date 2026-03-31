'use client';

import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/Badge';

interface BehavioralClassification {
  suggestedClass: string;
  classificationConfidence: number;
  reasoning: string;
}

interface ConfidenceRecord {
  ciSysId: string;
  ciClass: string;
  confidenceScore: number;
  trafficState: string;
  lastObservation: string;
  observationCount: number;
  behavioralClassification?: BehavioralClassification | null;
}

interface ConfidenceTableProps {
  records: ConfidenceRecord[];
}

type SortKey = 'ciSysId' | 'ciClass' | 'confidenceScore' | 'trafficState' | 'lastObservation' | 'observationCount';
type SortDir = 'asc' | 'desc';

const trafficStateConfig: Record<string, { variant: 'low' | 'medium' | 'critical' | 'default'; color: string }> = {
  active: { variant: 'low', color: '#22C55E' },
  idle: { variant: 'medium', color: '#EAB308' },
  deprecated: { variant: 'critical', color: '#EF4444' },
  unknown: { variant: 'default', color: '#6B6B7B' },
};

const trafficStateOrder: Record<string, number> = {
  active: 3,
  idle: 2,
  deprecated: 1,
  unknown: 0,
};

function ConfidenceBar({ score }: { score: number }) {
  let barColor = '#EF4444'; // red
  if (score >= 70) barColor = '#CCFF00'; // lime
  else if (score >= 40) barColor = '#EAB308'; // yellow

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-obsidian rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${score}%`, backgroundColor: barColor }}
        />
      </div>
      <span className="font-mono text-xs text-white w-7 text-right">{score}</span>
    </div>
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '--';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function ConfidenceTable({ records }: ConfidenceTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('confidenceScore');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = records;
    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.ciSysId.toLowerCase().includes(lower) ||
          r.ciClass.toLowerCase().includes(lower)
      );
    }
    if (stateFilter !== 'all') {
      result = result.filter((r) => r.trafficState === stateFilter);
    }
    return result;
  }, [records, search, stateFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'trafficState':
          cmp = (trafficStateOrder[a.trafficState] ?? 0) - (trafficStateOrder[b.trafficState] ?? 0);
          break;
        case 'ciSysId':
        case 'ciClass':
          cmp = a[sortKey].localeCompare(b[sortKey]);
          break;
        case 'lastObservation':
          cmp = new Date(a.lastObservation).getTime() - new Date(b.lastObservation).getTime();
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
    { key: 'ciSysId', label: 'CI ID' },
    { key: 'ciClass', label: 'Class' },
    { key: 'confidenceScore', label: 'Confidence' },
    { key: 'trafficState', label: 'Traffic State' },
    { key: 'lastObservation', label: 'Last Seen' },
    { key: 'observationCount', label: 'Observations' },
  ];

  const uniqueStates = Array.from(new Set(records.map((r) => r.trafficState)));

  return (
    <div className="bg-dark-gray rounded-xl overflow-hidden">
      {/* Controls */}
      <div className="p-4 border-b border-obsidian flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
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
            placeholder="Search CI ID or class..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg bg-obsidian border border-medium-gray/30 pl-10 pr-4 py-2 text-sm text-white placeholder:text-medium-gray focus:outline-none focus:border-lime/50"
          />
        </div>

        {/* State filter */}
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="rounded-lg bg-obsidian border border-medium-gray/30 px-3 py-2 text-sm text-white focus:outline-none focus:border-lime/50"
        >
          <option value="all">All States</option>
          {uniqueStates.map((state) => (
            <option key={state} value={state}>
              {state.charAt(0).toUpperCase() + state.slice(1)}
            </option>
          ))}
        </select>
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
            {sorted.map((record) => {
              const stateConf = trafficStateConfig[record.trafficState] ?? trafficStateConfig.unknown;
              const isExpanded = expandedRow === record.ciSysId;
              const hasClassification = record.behavioralClassification != null;

              return (
                <React.Fragment key={record.ciSysId}>
                  <tr
                    onClick={() => {
                      if (hasClassification) {
                        setExpandedRow(isExpanded ? null : record.ciSysId);
                      }
                    }}
                    className={`border-b border-obsidian/50 transition-colors ${
                      hasClassification
                        ? 'hover:bg-obsidian/50 cursor-pointer'
                        : ''
                    } ${isExpanded ? 'bg-obsidian/30' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-white">
                        {record.ciSysId.substring(0, 12)}...
                      </span>
                      {hasClassification && (
                        <span className="ml-1 text-lime text-xs">
                          {isExpanded ? '\u25BC' : '\u25B6'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs uppercase text-medium-gray">
                        {record.ciClass}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ConfidenceBar score={record.confidenceScore} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={stateConf.variant}>
                        {record.trafficState}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-medium-gray text-xs">
                      {formatDate(record.lastObservation)}
                    </td>
                    <td className="px-4 py-3 text-medium-gray font-mono">
                      {record.observationCount.toLocaleString()}
                    </td>
                  </tr>

                  {/* Expanded detail row */}
                  {isExpanded && record.behavioralClassification && (
                    <tr className="border-b border-obsidian/50">
                      <td colSpan={6} className="px-4 py-3 bg-obsidian/20">
                        <div className="pl-4 border-l-2 border-lime/30 space-y-2">
                          <h4 className="text-xs font-mono uppercase text-lime tracking-wider">
                            Behavioral Classification
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-medium-gray text-xs">Suggested Class:</span>
                              <p className="text-white font-mono text-xs">
                                {record.behavioralClassification.suggestedClass}
                              </p>
                            </div>
                            <div>
                              <span className="text-medium-gray text-xs">Classification Confidence:</span>
                              <p className="text-white font-mono text-xs">
                                {record.behavioralClassification.classificationConfidence}%
                              </p>
                            </div>
                          </div>
                          <div>
                            <span className="text-medium-gray text-xs">Reasoning:</span>
                            <p className="text-medium-gray text-sm mt-0.5">
                              {record.behavioralClassification.reasoning}
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-medium-gray">
                  No records match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Record count */}
      <div className="px-4 py-3 border-t border-obsidian text-xs text-medium-gray">
        Showing {sorted.length} of {records.length} records
      </div>
    </div>
  );
}
