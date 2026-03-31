'use client';

import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { SowPreview } from './SowPreview';
import type { EngagementType, RateCardRole } from '@/types/sow';

/* ---------- Types ---------- */

export interface SowFinding {
  id: string;
  title: string;
  module: string;
  severity: string;
  effortTshirt: string;
  effortHoursLow: number;
  effortHoursHigh: number;
  affectedCount: number;
  compositeScore: number;
  remediationDescription: string;
}

interface SowBuilderProps {
  assessmentId: string;
  findings: SowFinding[];
  customerName: string;
}

type Step = 1 | 2 | 3;

function severityVariant(
  severity: string,
): 'critical' | 'high' | 'medium' | 'low' | 'info' | 'default' {
  if (['critical', 'high', 'medium', 'low', 'info'].includes(severity)) {
    return severity as 'critical' | 'high' | 'medium' | 'low' | 'info';
  }
  return 'default';
}

/* ---------- Component ---------- */

export function SowBuilder({
  assessmentId,
  findings,
  customerName,
}: SowBuilderProps) {
  const [step, setStep] = useState<Step>(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Step 2 state
  const [engagementType, setEngagementType] =
    useState<EngagementType>('time_and_materials');
  const [blendedRate, setBlendedRate] = useState(200);
  const [roles, setRoles] = useState<RateCardRole[]>([]);
  const [marginTarget, setMarginTarget] = useState(35);
  const [startDate, setStartDate] = useState('');
  const [durationWeeks, setDurationWeeks] = useState(8);
  const [preparedBy, setPreparedBy] = useState('');

  // Step 3 state
  const [orgName, setOrgName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#CCFF00');
  const [legalText, setLegalText] = useState('');
  const [generateStatus, setGenerateStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [generateError, setGenerateError] = useState('');

  const selectedFindings = useMemo(
    () => findings.filter((f) => selectedIds.has(f.id)),
    [findings, selectedIds],
  );

  const totals = useMemo(() => {
    let hoursLow = 0;
    let hoursHigh = 0;
    for (const f of selectedFindings) {
      hoursLow += f.effortHoursLow * f.affectedCount;
      hoursHigh += f.effortHoursHigh * f.affectedCount;
    }
    return {
      count: selectedFindings.length,
      hoursLow,
      hoursHigh,
      revenueLow: hoursLow * blendedRate,
      revenueHigh: hoursHigh * blendedRate,
    };
  }, [selectedFindings, blendedRate]);

  /* ---------- Selection helpers ---------- */

  function toggleFinding(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(findings.map((f) => f.id)));
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  function selectBySeverity(severity: string) {
    setSelectedIds(
      new Set(findings.filter((f) => f.severity === severity).map((f) => f.id)),
    );
  }

  function selectQuickWins() {
    setSelectedIds(
      new Set(
        findings
          .filter(
            (f) =>
              ['critical', 'high'].includes(f.severity) &&
              ['XS', 'S'].includes(f.effortTshirt),
          )
          .map((f) => f.id),
      ),
    );
  }

  /* ---------- Role management ---------- */

  function addRole() {
    setRoles((prev) => [...prev, { name: '', hourlyRate: 0 }]);
  }

  function removeRole(index: number) {
    setRoles((prev) => prev.filter((_, i) => i !== index));
  }

  function updateRole(index: number, field: keyof RateCardRole, value: string | number) {
    setRoles((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    );
  }

  /* ---------- Generate SOW ---------- */

  async function handleGenerate() {
    setGenerateStatus('loading');
    setGenerateError('');
    try {
      const res = await fetch('/api/reports/sow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentId,
          selectedFindingIds: Array.from(selectedIds),
          engagementType,
          rateCard: {
            blendedRate,
            roles,
            defaultEngagementType: engagementType,
            marginTarget,
          },
          timeline: {
            startDate,
            durationWeeks,
          },
          preparedBy,
          brandConfig: {
            orgName,
            primaryColor,
            legalText,
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`SOW generation failed: ${res.statusText}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sow-${assessmentId}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setGenerateStatus('success');
    } catch (err) {
      setGenerateError(
        err instanceof Error ? err.message : 'SOW generation failed',
      );
      setGenerateStatus('error');
    }
  }

  /* ---------- Step indicator ---------- */

  const steps = [
    { num: 1 as Step, label: 'Select Findings' },
    { num: 2 as Step, label: 'Configure Engagement' },
    { num: 3 as Step, label: 'Review & Generate' },
  ];

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {steps.map(({ num, label }, i) => (
          <React.Fragment key={num}>
            <button
              onClick={() => setStep(num)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-heading font-semibold transition-colors ${
                step === num
                  ? 'bg-lime text-obsidian'
                  : step > num
                    ? 'bg-dark-gray text-lime'
                    : 'bg-dark-gray text-medium-gray'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono ${
                  step === num
                    ? 'bg-obsidian text-lime'
                    : step > num
                      ? 'bg-lime/20 text-lime'
                      : 'bg-obsidian/50 text-medium-gray'
                }`}
              >
                {step > num ? '\u2713' : num}
              </span>
              {label}
            </button>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-px max-w-12 ${
                  step > num ? 'bg-lime/50' : 'bg-medium-gray/30'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Select Findings */}
      {step === 1 && (
        <div className="space-y-4">
          {/* Quick actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={selectAll}
              className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-lg bg-dark-gray text-white hover:bg-dark-gray/80 transition-colors border border-medium-gray/20"
            >
              Select All
            </button>
            <button
              onClick={deselectAll}
              className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-lg bg-dark-gray text-white hover:bg-dark-gray/80 transition-colors border border-medium-gray/20"
            >
              Deselect All
            </button>
            <div className="w-px h-5 bg-medium-gray/30" />
            <button
              onClick={() => selectBySeverity('critical')}
              className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors border border-red-500/20"
            >
              All Critical
            </button>
            <button
              onClick={() => selectBySeverity('high')}
              className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-colors border border-orange-500/20"
            >
              All High
            </button>
            <button
              onClick={selectQuickWins}
              className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-lg bg-lime/10 text-lime hover:bg-lime/20 transition-colors border border-lime/20"
            >
              Quick Wins Only
            </button>
          </div>

          {/* Findings table */}
          <div className="bg-dark-gray rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-obsidian">
                    <th className="px-4 py-3 text-left w-10">
                      <input
                        type="checkbox"
                        checked={
                          findings.length > 0 &&
                          selectedIds.size === findings.length
                        }
                        onChange={(e) =>
                          e.target.checked ? selectAll() : deselectAll()
                        }
                        className="rounded border-medium-gray/50 bg-obsidian text-lime focus:ring-lime/30"
                      />
                    </th>
                    {[
                      'Title',
                      'Module',
                      'Severity',
                      'Effort',
                      'Hours',
                      'Affected',
                    ].map((label) => (
                      <th
                        key={label}
                        className="px-4 py-3 text-left text-xs font-mono uppercase tracking-wider text-medium-gray"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {findings.map((f) => (
                    <tr
                      key={f.id}
                      onClick={() => toggleFinding(f.id)}
                      className={`border-b border-obsidian/50 cursor-pointer transition-colors ${
                        selectedIds.has(f.id)
                          ? 'bg-lime/5'
                          : 'hover:bg-obsidian/50'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(f.id)}
                          onChange={() => toggleFinding(f.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-medium-gray/50 bg-obsidian text-lime focus:ring-lime/30"
                        />
                      </td>
                      <td className="px-4 py-3 text-white max-w-xs">
                        <p className="truncate">{f.title}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs uppercase text-medium-gray">
                          {f.module}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={severityVariant(f.severity)}>
                          {f.severity}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="default">{f.effortTshirt}</Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-medium-gray">
                        {f.effortHoursLow}-{f.effortHoursHigh}
                      </td>
                      <td className="px-4 py-3 text-medium-gray">
                        {f.affectedCount}
                      </td>
                    </tr>
                  ))}
                  {findings.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-medium-gray"
                      >
                        No findings available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Running total */}
          <Card className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs font-mono uppercase text-medium-gray">
                  Selected
                </p>
                <p className="text-xl font-heading font-bold text-white">
                  {totals.count}{' '}
                  <span className="text-sm text-medium-gray font-normal">
                    findings
                  </span>
                </p>
              </div>
              <div className="w-px h-10 bg-medium-gray/20" />
              <div>
                <p className="text-xs font-mono uppercase text-medium-gray">
                  Hours
                </p>
                <p className="text-xl font-heading font-bold text-white">
                  {totals.hoursLow.toLocaleString()}-
                  {totals.hoursHigh.toLocaleString()}
                </p>
              </div>
              <div className="w-px h-10 bg-medium-gray/20" />
              <div>
                <p className="text-xs font-mono uppercase text-medium-gray">
                  Estimated Revenue
                </p>
                <p className="text-xl font-heading font-bold text-lime">
                  ${totals.revenueLow.toLocaleString()}-$
                  {totals.revenueHigh.toLocaleString()}
                </p>
              </div>
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={selectedIds.size === 0}
              className="px-6 py-2.5 rounded-lg bg-lime text-obsidian font-heading font-semibold hover:bg-lime/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next: Configure Engagement
            </button>
          </Card>
        </div>
      )}

      {/* Step 2: Configure Engagement */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Engagement type */}
            <Card>
              <h4 className="font-heading text-lg font-semibold text-white mb-4">
                Engagement Type
              </h4>
              <div className="space-y-3">
                {(
                  [
                    {
                      value: 'time_and_materials' as EngagementType,
                      label: 'Time & Materials',
                      desc: 'Bill hours as consumed',
                    },
                    {
                      value: 'fixed_fee' as EngagementType,
                      label: 'Fixed Fee',
                      desc: 'Set price with margin target',
                    },
                    {
                      value: 'blended' as EngagementType,
                      label: 'Blended',
                      desc: 'Mix of T&M and fixed deliverables',
                    },
                  ] as const
                ).map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors border ${
                      engagementType === opt.value
                        ? 'border-lime/50 bg-lime/5'
                        : 'border-medium-gray/20 bg-obsidian hover:border-medium-gray/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="engagementType"
                      value={opt.value}
                      checked={engagementType === opt.value}
                      onChange={() => setEngagementType(opt.value)}
                      className="mt-0.5 text-lime focus:ring-lime/30 bg-obsidian border-medium-gray/50"
                    />
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {opt.label}
                      </p>
                      <p className="text-xs text-medium-gray">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </Card>

            {/* Rate card */}
            <Card>
              <h4 className="font-heading text-lg font-semibold text-white mb-4">
                Rate Card
              </h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white mb-1">
                    Blended Rate ($/hr)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={blendedRate}
                    onChange={(e) => setBlendedRate(Number(e.target.value))}
                    className="w-full rounded-lg bg-obsidian border border-medium-gray/30 px-4 py-2 text-sm text-white font-mono focus:outline-none focus:border-lime/50 focus:ring-1 focus:ring-lime/30"
                  />
                </div>

                {engagementType === 'fixed_fee' && (
                  <div>
                    <label className="block text-sm text-white mb-1">
                      Margin Target (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={marginTarget}
                      onChange={(e) => setMarginTarget(Number(e.target.value))}
                      className="w-full rounded-lg bg-obsidian border border-medium-gray/30 px-4 py-2 text-sm text-white font-mono focus:outline-none focus:border-lime/50 focus:ring-1 focus:ring-lime/30"
                    />
                  </div>
                )}

                {/* Per-role rates */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-white">
                      Per-Role Rates (optional)
                    </label>
                    <button
                      onClick={addRole}
                      className="text-xs font-mono text-lime hover:text-lime/80 transition-colors"
                    >
                      + Add Role
                    </button>
                  </div>
                  {roles.map((role, i) => (
                    <div key={i} className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Role name"
                        value={role.name}
                        onChange={(e) => updateRole(i, 'name', e.target.value)}
                        className="flex-1 rounded-lg bg-obsidian border border-medium-gray/30 px-3 py-1.5 text-sm text-white placeholder:text-medium-gray focus:outline-none focus:border-lime/50 focus:ring-1 focus:ring-lime/30"
                      />
                      <input
                        type="number"
                        placeholder="$/hr"
                        min={0}
                        value={role.hourlyRate || ''}
                        onChange={(e) =>
                          updateRole(i, 'hourlyRate', Number(e.target.value))
                        }
                        className="w-24 rounded-lg bg-obsidian border border-medium-gray/30 px-3 py-1.5 text-sm text-white font-mono placeholder:text-medium-gray focus:outline-none focus:border-lime/50 focus:ring-1 focus:ring-lime/30"
                      />
                      <button
                        onClick={() => removeRole(i)}
                        className="p-1.5 text-medium-gray hover:text-red-400 transition-colors"
                        title="Remove role"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Timeline */}
            <Card>
              <h4 className="font-heading text-lg font-semibold text-white mb-4">
                Timeline
              </h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg bg-obsidian border border-medium-gray/30 px-4 py-2 text-sm text-white focus:outline-none focus:border-lime/50 focus:ring-1 focus:ring-lime/30"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white mb-1">
                    Duration (weeks)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={durationWeeks}
                    onChange={(e) => setDurationWeeks(Number(e.target.value))}
                    className="w-full rounded-lg bg-obsidian border border-medium-gray/30 px-4 py-2 text-sm text-white font-mono focus:outline-none focus:border-lime/50 focus:ring-1 focus:ring-lime/30"
                  />
                </div>
              </div>
            </Card>

            {/* Prepared by */}
            <Card>
              <h4 className="font-heading text-lg font-semibold text-white mb-4">
                Prepared By
              </h4>
              <input
                type="text"
                value={preparedBy}
                onChange={(e) => setPreparedBy(e.target.value)}
                placeholder="Consultant name"
                className="w-full rounded-lg bg-obsidian border border-medium-gray/30 px-4 py-2 text-sm text-white placeholder:text-medium-gray focus:outline-none focus:border-lime/50 focus:ring-1 focus:ring-lime/30"
              />
            </Card>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-2.5 rounded-lg bg-dark-gray text-white font-heading font-semibold hover:bg-dark-gray/80 transition-colors border border-medium-gray/20"
            >
              Back: Select Findings
            </button>
            <button
              onClick={() => setStep(3)}
              className="px-6 py-2.5 rounded-lg bg-lime text-obsidian font-heading font-semibold hover:bg-lime/90 transition-colors"
            >
              Next: Review &amp; Generate
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Generate */}
      {step === 3 && (
        <div className="space-y-6">
          <SowPreview
            findings={selectedFindings}
            engagementType={engagementType}
            blendedRate={blendedRate}
            roles={roles}
            marginTarget={marginTarget}
            startDate={startDate}
            durationWeeks={durationWeeks}
            preparedBy={preparedBy}
            customerName={customerName}
          />

          {/* Branding config */}
          <Card>
            <h4 className="font-heading text-lg font-semibold text-white mb-4">
              Branding
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-white mb-1">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Acme Corp"
                  className="w-full rounded-lg bg-obsidian border border-medium-gray/30 px-4 py-2 text-sm text-white placeholder:text-medium-gray focus:outline-none focus:border-lime/50 focus:ring-1 focus:ring-lime/30"
                />
              </div>
              <div>
                <label className="block text-sm text-white mb-1">
                  Primary Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded border border-medium-gray/30 bg-obsidian cursor-pointer"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 rounded-lg bg-obsidian border border-medium-gray/30 px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-lime/50 focus:ring-1 focus:ring-lime/30"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-white mb-1">
                  Legal Text
                </label>
                <textarea
                  value={legalText}
                  onChange={(e) => setLegalText(e.target.value)}
                  placeholder="Disclaimer or legal boilerplate..."
                  rows={2}
                  className="w-full rounded-lg bg-obsidian border border-medium-gray/30 px-4 py-2 text-sm text-white placeholder:text-medium-gray focus:outline-none focus:border-lime/50 focus:ring-1 focus:ring-lime/30 resize-none"
                />
              </div>
            </div>
          </Card>

          {/* Generate button */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-2.5 rounded-lg bg-dark-gray text-white font-heading font-semibold hover:bg-dark-gray/80 transition-colors border border-medium-gray/20"
            >
              Back: Configure
            </button>
            <div className="flex items-center gap-4">
              {generateError && (
                <p className="text-red-400 text-sm">{generateError}</p>
              )}
              {generateStatus === 'success' && (
                <p className="text-green-400 text-sm">
                  SOW downloaded successfully.
                </p>
              )}
              <button
                onClick={handleGenerate}
                disabled={generateStatus === 'loading'}
                className="px-8 py-3 rounded-lg bg-lime text-obsidian font-heading font-bold text-lg hover:bg-lime/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {generateStatus === 'loading' ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Generating...
                  </>
                ) : (
                  'Generate SOW'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
