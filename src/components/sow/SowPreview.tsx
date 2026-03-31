'use client';

import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import type { EngagementType, RateCardRole } from '@/types/sow';
import type { SowFinding } from './SowBuilder';

interface SowPreviewProps {
  findings: SowFinding[];
  engagementType: EngagementType;
  blendedRate: number;
  roles: RateCardRole[];
  marginTarget: number;
  startDate: string;
  durationWeeks: number;
  preparedBy: string;
  customerName: string;
}

function severityVariant(
  severity: string,
): 'critical' | 'high' | 'medium' | 'low' | 'info' | 'default' {
  if (['critical', 'high', 'medium', 'low', 'info'].includes(severity)) {
    return severity as 'critical' | 'high' | 'medium' | 'low' | 'info';
  }
  return 'default';
}

const engagementLabels: Record<EngagementType, string> = {
  time_and_materials: 'Time & Materials',
  fixed_fee: 'Fixed Fee',
  blended: 'Blended',
};

export function SowPreview({
  findings,
  engagementType,
  blendedRate,
  roles,
  marginTarget,
  startDate,
  durationWeeks,
  preparedBy,
  customerName,
}: SowPreviewProps) {
  // Group findings by module
  const byModule = useMemo(() => {
    const groups: Record<
      string,
      {
        findings: SowFinding[];
        hoursLow: number;
        hoursHigh: number;
      }
    > = {};

    for (const f of findings) {
      if (!groups[f.module]) {
        groups[f.module] = { findings: [], hoursLow: 0, hoursHigh: 0 };
      }
      groups[f.module].findings.push(f);
      groups[f.module].hoursLow += f.effortHoursLow * f.affectedCount;
      groups[f.module].hoursHigh += f.effortHoursHigh * f.affectedCount;
    }

    return groups;
  }, [findings]);

  // Totals
  const totals = useMemo(() => {
    let hoursLow = 0;
    let hoursHigh = 0;
    for (const f of findings) {
      hoursLow += f.effortHoursLow * f.affectedCount;
      hoursHigh += f.effortHoursHigh * f.affectedCount;
    }
    const revenueLow = hoursLow * blendedRate;
    const revenueHigh = hoursHigh * blendedRate;
    return { hoursLow, hoursHigh, revenueLow, revenueHigh };
  }, [findings, blendedRate]);

  // Timeline phases (approximate)
  const phases = useMemo(() => {
    if (!startDate || durationWeeks <= 0) return [];
    const start = new Date(startDate);
    const totalWeeks = durationWeeks;
    const moduleNames = Object.keys(byModule);

    if (moduleNames.length === 0) return [];

    // Divide the timeline evenly among modules, plus a kick-off and wrap-up week
    const kickoff = {
      name: 'Project Kick-off',
      startWeek: 1,
      endWeek: 1,
      description: 'Project initiation, environment access, stakeholder alignment',
    };

    const weeksForWork = Math.max(totalWeeks - 2, 1);
    const weeksPerModule = Math.max(Math.floor(weeksForWork / moduleNames.length), 1);

    const modulePhases = moduleNames.map((mod, i) => ({
      name: `${mod.toUpperCase()} Remediation`,
      startWeek: 2 + i * weeksPerModule,
      endWeek: Math.min(2 + (i + 1) * weeksPerModule - 1, totalWeeks - 1),
      description: `Remediate ${byModule[mod].findings.length} findings in the ${mod} module`,
    }));

    const wrapup = {
      name: 'Testing & Handoff',
      startWeek: totalWeeks,
      endWeek: totalWeeks,
      description: 'Integration testing, documentation, knowledge transfer',
    };

    return [kickoff, ...modulePhases, wrapup];
  }, [startDate, durationWeeks, byModule]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-medium-gray mb-1">
              Statement of Work Preview
            </p>
            <h3 className="font-heading text-xl font-bold text-white">
              ServiceNow Health Remediation &mdash; {customerName}
            </h3>
          </div>
          <div className="text-right text-sm text-medium-gray">
            {preparedBy && <p>Prepared by: {preparedBy}</p>}
            {startDate && (
              <p>
                Start: {new Date(startDate).toLocaleDateString()}
              </p>
            )}
            <p>Duration: {durationWeeks} weeks</p>
          </div>
        </div>
      </Card>

      {/* Module breakdown */}
      <Card>
        <h4 className="font-heading text-lg font-semibold text-white mb-4">
          Scope by Module
        </h4>
        <div className="space-y-4">
          {Object.entries(byModule).map(([module, data]) => (
            <div
              key={module}
              className="border border-medium-gray/20 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-mono text-sm uppercase tracking-wider text-lime">
                  {module}
                </h5>
                <span className="text-xs text-medium-gray font-mono">
                  {data.hoursLow}-{data.hoursHigh} hrs | $
                  {(data.hoursLow * blendedRate).toLocaleString()}-$
                  {(data.hoursHigh * blendedRate).toLocaleString()}
                </span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-obsidian/50">
                    <th className="text-left py-1.5 text-xs font-mono uppercase text-medium-gray">
                      Finding
                    </th>
                    <th className="text-left py-1.5 text-xs font-mono uppercase text-medium-gray w-24">
                      Severity
                    </th>
                    <th className="text-left py-1.5 text-xs font-mono uppercase text-medium-gray w-20">
                      Effort
                    </th>
                    <th className="text-right py-1.5 text-xs font-mono uppercase text-medium-gray w-24">
                      Hours
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.findings.map((f) => (
                    <tr
                      key={f.id}
                      className="border-b border-obsidian/30"
                    >
                      <td className="py-2 text-white">{f.title}</td>
                      <td className="py-2">
                        <Badge variant={severityVariant(f.severity)}>
                          {f.severity}
                        </Badge>
                      </td>
                      <td className="py-2">
                        <Badge variant="default">{f.effortTshirt}</Badge>
                      </td>
                      <td className="py-2 text-right font-mono text-xs text-medium-gray">
                        {f.effortHoursLow * f.affectedCount}-
                        {f.effortHoursHigh * f.affectedCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </Card>

      {/* Pricing summary */}
      <Card>
        <h4 className="font-heading text-lg font-semibold text-white mb-4">
          Pricing Summary
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-obsidian rounded-lg p-4">
            <p className="text-xs font-mono uppercase text-medium-gray mb-1">
              Engagement Type
            </p>
            <p className="text-white font-semibold">
              {engagementLabels[engagementType]}
            </p>
          </div>
          <div className="bg-obsidian rounded-lg p-4">
            <p className="text-xs font-mono uppercase text-medium-gray mb-1">
              Blended Rate
            </p>
            <p className="text-white font-semibold font-mono">
              ${blendedRate}/hr
            </p>
          </div>
          <div className="bg-obsidian rounded-lg p-4">
            <p className="text-xs font-mono uppercase text-medium-gray mb-1">
              Total Hours
            </p>
            <p className="text-white font-semibold font-mono">
              {totals.hoursLow.toLocaleString()}-
              {totals.hoursHigh.toLocaleString()}
            </p>
          </div>
          <div className="bg-obsidian rounded-lg p-4">
            <p className="text-xs font-mono uppercase text-medium-gray mb-1">
              Total Revenue
            </p>
            <p className="text-lime font-bold font-mono text-lg">
              ${totals.revenueLow.toLocaleString()}-$
              {totals.revenueHigh.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Role breakdown if roles are configured */}
        {roles.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-mono uppercase text-medium-gray mb-2">
              Role Rates
            </p>
            <div className="flex flex-wrap gap-2">
              {roles.map((role, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 bg-obsidian rounded-lg px-3 py-1.5 text-sm"
                >
                  <span className="text-white">{role.name || 'Unnamed'}</span>
                  <span className="text-medium-gray font-mono text-xs">
                    ${role.hourlyRate}/hr
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {engagementType === 'fixed_fee' && (
          <div className="mt-4 bg-obsidian rounded-lg p-4">
            <p className="text-xs font-mono uppercase text-medium-gray mb-1">
              Fixed Fee (with {marginTarget}% margin)
            </p>
            <p className="text-lime font-bold font-mono text-lg">
              $
              {Math.round(
                totals.revenueHigh / (1 - marginTarget / 100),
              ).toLocaleString()}
            </p>
          </div>
        )}
      </Card>

      {/* Timeline phases */}
      {phases.length > 0 && (
        <Card>
          <h4 className="font-heading text-lg font-semibold text-white mb-4">
            Timeline
          </h4>
          <div className="space-y-3">
            {phases.map((phase, i) => (
              <div
                key={i}
                className="flex items-start gap-4 bg-obsidian rounded-lg p-4"
              >
                <div className="flex-shrink-0 w-20">
                  <p className="text-xs font-mono text-lime">
                    {phase.startWeek === phase.endWeek
                      ? `Week ${phase.startWeek}`
                      : `Wk ${phase.startWeek}-${phase.endWeek}`}
                  </p>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">
                    {phase.name}
                  </p>
                  <p className="text-medium-gray text-xs mt-0.5">
                    {phase.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
