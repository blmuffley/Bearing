'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';

interface AssessmentRow {
  id: string;
  healthScore: number;
  domainScores: Record<string, number>;
  createdAt: string;
  totalFindings: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

interface AssessmentComparisonTableProps {
  assessments: AssessmentRow[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function DeltaCell({ current, previous }: { current: number; previous: number }) {
  const delta = current - previous;
  if (delta === 0) return <span className="text-medium-gray">--</span>;
  const isPositive = delta > 0;
  return (
    <span className={`font-mono text-xs font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
      {isPositive ? '+' : ''}{delta}
    </span>
  );
}

export function AssessmentComparisonTable({ assessments }: AssessmentComparisonTableProps) {
  const [selectedA, setSelectedA] = useState<string>(
    assessments.length >= 2 ? assessments[assessments.length - 2].id : assessments[0]?.id ?? ''
  );
  const [selectedB, setSelectedB] = useState<string>(
    assessments.length >= 1 ? assessments[assessments.length - 1].id : ''
  );

  if (assessments.length < 2) {
    return (
      <Card>
        <div className="flex items-center justify-center h-32">
          <p className="text-medium-gray text-sm">
            Run at least two assessments to enable side-by-side comparison.
          </p>
        </div>
      </Card>
    );
  }

  const a = assessments.find((r) => r.id === selectedA);
  const b = assessments.find((r) => r.id === selectedB);

  // Collect all domain keys from both
  const allDomainKeys = new Set<string>();
  if (a) Object.keys(a.domainScores).forEach((k) => allDomainKeys.add(k));
  if (b) Object.keys(b.domainScores).forEach((k) => allDomainKeys.add(k));
  const domainKeys = Array.from(allDomainKeys).sort();

  return (
    <Card>
      <div className="space-y-4">
        {/* Selectors */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-medium-gray text-sm">Assessment A:</label>
            <select
              value={selectedA}
              onChange={(e) => setSelectedA(e.target.value)}
              className="bg-obsidian border border-dark-gray rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-lime"
            >
              {assessments.map((r) => (
                <option key={r.id} value={r.id}>
                  {formatDate(r.createdAt)} (Score: {r.healthScore})
                </option>
              ))}
            </select>
          </div>
          <span className="text-medium-gray">vs</span>
          <div className="flex items-center gap-2">
            <label className="text-medium-gray text-sm">Assessment B:</label>
            <select
              value={selectedB}
              onChange={(e) => setSelectedB(e.target.value)}
              className="bg-obsidian border border-dark-gray rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-lime"
            >
              {assessments.map((r) => (
                <option key={r.id} value={r.id}>
                  {formatDate(r.createdAt)} (Score: {r.healthScore})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Comparison table */}
        {a && b && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-medium-gray text-xs uppercase tracking-wider border-b border-dark-gray">
                  <th className="text-left py-2 pr-4 font-medium">Metric</th>
                  <th className="text-right py-2 px-4 font-medium">
                    {formatDate(a.createdAt)}
                  </th>
                  <th className="text-right py-2 px-4 font-medium">
                    {formatDate(b.createdAt)}
                  </th>
                  <th className="text-right py-2 pl-4 font-medium">Delta</th>
                </tr>
              </thead>
              <tbody>
                {/* Health Score */}
                <tr className="border-t border-dark-gray/50">
                  <td className="py-2.5 pr-4 text-white font-medium">Health Score</td>
                  <td className="py-2.5 px-4 text-right text-white font-mono">{a.healthScore}</td>
                  <td className="py-2.5 px-4 text-right text-white font-mono">{b.healthScore}</td>
                  <td className="py-2.5 pl-4 text-right">
                    <DeltaCell current={b.healthScore} previous={a.healthScore} />
                  </td>
                </tr>

                {/* Total Findings */}
                <tr className="border-t border-dark-gray/50">
                  <td className="py-2.5 pr-4 text-white">Total Findings</td>
                  <td className="py-2.5 px-4 text-right text-medium-gray font-mono">{a.totalFindings}</td>
                  <td className="py-2.5 px-4 text-right text-medium-gray font-mono">{b.totalFindings}</td>
                  <td className="py-2.5 pl-4 text-right">
                    <DeltaCell current={b.totalFindings} previous={a.totalFindings} />
                  </td>
                </tr>

                {/* Critical */}
                <tr className="border-t border-dark-gray/50">
                  <td className="py-2.5 pr-4 text-red-400">Critical</td>
                  <td className="py-2.5 px-4 text-right text-medium-gray font-mono">{a.criticalCount}</td>
                  <td className="py-2.5 px-4 text-right text-medium-gray font-mono">{b.criticalCount}</td>
                  <td className="py-2.5 pl-4 text-right">
                    <DeltaCell current={b.criticalCount} previous={a.criticalCount} />
                  </td>
                </tr>

                {/* High */}
                <tr className="border-t border-dark-gray/50">
                  <td className="py-2.5 pr-4 text-orange-400">High</td>
                  <td className="py-2.5 px-4 text-right text-medium-gray font-mono">{a.highCount}</td>
                  <td className="py-2.5 px-4 text-right text-medium-gray font-mono">{b.highCount}</td>
                  <td className="py-2.5 pl-4 text-right">
                    <DeltaCell current={b.highCount} previous={a.highCount} />
                  </td>
                </tr>

                {/* Medium */}
                <tr className="border-t border-dark-gray/50">
                  <td className="py-2.5 pr-4 text-yellow-400">Medium</td>
                  <td className="py-2.5 px-4 text-right text-medium-gray font-mono">{a.mediumCount}</td>
                  <td className="py-2.5 px-4 text-right text-medium-gray font-mono">{b.mediumCount}</td>
                  <td className="py-2.5 pl-4 text-right">
                    <DeltaCell current={b.mediumCount} previous={a.mediumCount} />
                  </td>
                </tr>

                {/* Low */}
                <tr className="border-t border-dark-gray/50">
                  <td className="py-2.5 pr-4 text-green-400">Low</td>
                  <td className="py-2.5 px-4 text-right text-medium-gray font-mono">{a.lowCount}</td>
                  <td className="py-2.5 px-4 text-right text-medium-gray font-mono">{b.lowCount}</td>
                  <td className="py-2.5 pl-4 text-right">
                    <DeltaCell current={b.lowCount} previous={a.lowCount} />
                  </td>
                </tr>

                {/* Domain scores */}
                {domainKeys.map((domain) => (
                  <tr key={domain} className="border-t border-dark-gray/50">
                    <td className="py-2.5 pr-4 text-white capitalize">{domain}</td>
                    <td className="py-2.5 px-4 text-right text-medium-gray font-mono">
                      {a.domainScores[domain] ?? '--'}
                    </td>
                    <td className="py-2.5 px-4 text-right text-medium-gray font-mono">
                      {b.domainScores[domain] ?? '--'}
                    </td>
                    <td className="py-2.5 pl-4 text-right">
                      {a.domainScores[domain] != null && b.domainScores[domain] != null ? (
                        <DeltaCell
                          current={b.domainScores[domain]}
                          previous={a.domainScores[domain]}
                        />
                      ) : (
                        <span className="text-medium-gray">--</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}
