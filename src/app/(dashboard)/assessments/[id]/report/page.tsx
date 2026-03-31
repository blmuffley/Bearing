'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface ReportConfig {
  blendedRate: number;
  marginTarget: number;
}

interface BrandConfig {
  orgName: string;
  primaryColor: string;
  legalText: string;
}

type DownloadStatus = 'idle' | 'loading' | 'success' | 'error';

async function downloadReport(
  endpoint: string,
  assessmentId: string,
  config: Record<string, unknown>,
  filename: string,
) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assessmentId, ...config }),
  });

  if (!res.ok) {
    throw new Error(`Report generation failed: ${res.statusText}`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { id } = useParams<{ id: string }>();

  // Consultant report config
  const [consultantConfig, setConsultantConfig] = useState<ReportConfig>({
    blendedRate: 200,
    marginTarget: 35,
  });
  const [consultantStatus, setConsultantStatus] = useState<DownloadStatus>('idle');
  const [consultantError, setConsultantError] = useState('');

  // Customer report config
  const [brandConfig, setBrandConfig] = useState<BrandConfig>({
    orgName: '',
    primaryColor: '#CCFF00',
    legalText: '',
  });
  const [customerStatus, setCustomerStatus] = useState<DownloadStatus>('idle');
  const [customerError, setCustomerError] = useState('');

  async function handleConsultantDownload() {
    setConsultantStatus('loading');
    setConsultantError('');
    try {
      await downloadReport(
        '/api/reports/consultant',
        id,
        {
          blendedRate: consultantConfig.blendedRate,
          marginTarget: consultantConfig.marginTarget,
        },
        `consultant-report-${id}.docx`,
      );
      setConsultantStatus('success');
      setTimeout(() => setConsultantStatus('idle'), 3000);
    } catch (err) {
      setConsultantError(err instanceof Error ? err.message : 'Download failed');
      setConsultantStatus('error');
    }
  }

  async function handleCustomerDownload() {
    setCustomerStatus('loading');
    setCustomerError('');
    try {
      await downloadReport(
        '/api/reports/customer',
        id,
        {
          orgName: brandConfig.orgName,
          primaryColor: brandConfig.primaryColor,
          legalText: brandConfig.legalText,
        },
        `customer-report-${id}.docx`,
      );
      setCustomerStatus('success');
      setTimeout(() => setCustomerStatus('idle'), 3000);
    } catch (err) {
      setCustomerError(err instanceof Error ? err.message : 'Download failed');
      setCustomerStatus('error');
    }
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <Link
          href={`/assessments/${id}`}
          className="text-medium-gray text-sm hover:text-white transition-colors mb-1 inline-block"
        >
          &larr; Back to Assessment
        </Link>
        <h1 className="font-heading text-3xl font-bold text-white">Reports</h1>
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Consultant Report */}
        <Card className="flex flex-col">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-heading text-lg font-semibold text-white">
              Internal Consultant Report
            </h3>
            <Badge variant="critical" className="uppercase tracking-wider">
              Confidential
            </Badge>
          </div>
          <p className="text-medium-gray text-sm mb-6">
            Full assessment with pricing, margin analysis, and revenue breakdown.
            For internal use only.
          </p>

          {/* Rate card configuration */}
          <div className="space-y-4 mb-6">
            <h4 className="font-mono text-xs uppercase tracking-wider text-medium-gray">
              Rate Card Configuration
            </h4>
            <div>
              <label className="block text-sm text-white mb-1">
                Blended Rate ($/hr)
              </label>
              <input
                type="number"
                min={0}
                value={consultantConfig.blendedRate}
                onChange={(e) =>
                  setConsultantConfig((c) => ({
                    ...c,
                    blendedRate: Number(e.target.value),
                  }))
                }
                className="w-full rounded-lg bg-obsidian border border-medium-gray/30 px-4 py-2 text-sm text-white placeholder:text-medium-gray focus:outline-none focus:border-lime/50 focus:ring-1 focus:ring-lime/30 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm text-white mb-1">
                Margin Target (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={consultantConfig.marginTarget}
                onChange={(e) =>
                  setConsultantConfig((c) => ({
                    ...c,
                    marginTarget: Number(e.target.value),
                  }))
                }
                className="w-full rounded-lg bg-obsidian border border-medium-gray/30 px-4 py-2 text-sm text-white placeholder:text-medium-gray focus:outline-none focus:border-lime/50 focus:ring-1 focus:ring-lime/30 font-mono"
              />
            </div>
          </div>

          <div className="mt-auto">
            {consultantError && (
              <p className="text-red-400 text-sm mb-3">{consultantError}</p>
            )}
            {consultantStatus === 'success' && (
              <p className="text-green-400 text-sm mb-3">
                Report downloaded successfully.
              </p>
            )}
            <button
              onClick={handleConsultantDownload}
              disabled={consultantStatus === 'loading'}
              className="w-full rounded-lg bg-lime text-obsidian font-heading font-semibold py-3 px-4 hover:bg-lime/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {consultantStatus === 'loading' ? (
                <>
                  <Spinner />
                  Generating...
                </>
              ) : (
                <>
                  <DownloadIcon />
                  Generate &amp; Download
                </>
              )}
            </button>
          </div>
        </Card>

        {/* Customer Report */}
        <Card className="flex flex-col">
          <div className="mb-2">
            <h3 className="font-heading text-lg font-semibold text-white">
              Customer-Facing Report
            </h3>
          </div>
          <p className="text-medium-gray text-sm mb-6">
            White-labeled health assessment with risk analysis and remediation
            guidance. No pricing included.
          </p>

          {/* Branding configuration */}
          <div className="space-y-4 mb-6">
            <h4 className="font-mono text-xs uppercase tracking-wider text-medium-gray">
              Branding Configuration
            </h4>
            <div>
              <label className="block text-sm text-white mb-1">
                Organization Name
              </label>
              <input
                type="text"
                value={brandConfig.orgName}
                onChange={(e) =>
                  setBrandConfig((c) => ({ ...c, orgName: e.target.value }))
                }
                placeholder="Acme Corp"
                className="w-full rounded-lg bg-obsidian border border-medium-gray/30 px-4 py-2 text-sm text-white placeholder:text-medium-gray focus:outline-none focus:border-lime/50 focus:ring-1 focus:ring-lime/30"
              />
            </div>
            <div>
              <label className="block text-sm text-white mb-1">
                Primary Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={brandConfig.primaryColor}
                  onChange={(e) =>
                    setBrandConfig((c) => ({
                      ...c,
                      primaryColor: e.target.value,
                    }))
                  }
                  className="w-10 h-10 rounded border border-medium-gray/30 bg-obsidian cursor-pointer"
                />
                <input
                  type="text"
                  value={brandConfig.primaryColor}
                  onChange={(e) =>
                    setBrandConfig((c) => ({
                      ...c,
                      primaryColor: e.target.value,
                    }))
                  }
                  className="flex-1 rounded-lg bg-obsidian border border-medium-gray/30 px-4 py-2 text-sm text-white font-mono focus:outline-none focus:border-lime/50 focus:ring-1 focus:ring-lime/30"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-white mb-1">
                Legal / Disclaimer Text
              </label>
              <textarea
                value={brandConfig.legalText}
                onChange={(e) =>
                  setBrandConfig((c) => ({ ...c, legalText: e.target.value }))
                }
                placeholder="This report is confidential and intended solely for..."
                rows={3}
                className="w-full rounded-lg bg-obsidian border border-medium-gray/30 px-4 py-2 text-sm text-white placeholder:text-medium-gray focus:outline-none focus:border-lime/50 focus:ring-1 focus:ring-lime/30 resize-none"
              />
            </div>
          </div>

          <div className="mt-auto">
            {customerError && (
              <p className="text-red-400 text-sm mb-3">{customerError}</p>
            )}
            {customerStatus === 'success' && (
              <p className="text-green-400 text-sm mb-3">
                Report downloaded successfully.
              </p>
            )}
            <button
              onClick={handleCustomerDownload}
              disabled={customerStatus === 'loading'}
              className="w-full rounded-lg bg-lime text-obsidian font-heading font-semibold py-3 px-4 hover:bg-lime/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {customerStatus === 'loading' ? (
                <>
                  <Spinner />
                  Generating...
                </>
              ) : (
                <>
                  <DownloadIcon />
                  Generate &amp; Download
                </>
              )}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---------- Small inline icons ---------- */

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
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
  );
}

function DownloadIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
      />
    </svg>
  );
}
