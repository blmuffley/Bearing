import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { CoverageZoneMap } from '@/components/dashboard/CoverageZoneMap';
import { ConfidenceTable } from '@/components/dashboard/ConfidenceTable';
import { Badge } from '@/components/ui/Badge';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PathfinderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  // Fetch assessment with instance connection
  const { data: assessment, error: assessError } = await supabase
    .from('assessments')
    .select('*, instance_connections(id, customer_name, instance_url)')
    .eq('id', id)
    .single();

  if (assessError || !assessment) {
    notFound();
  }

  const customerName =
    (assessment.instance_connections as any)?.customer_name ?? 'Assessment';
  const connectionId = (assessment.instance_connections as any)?.id ?? assessment.instance_connection_id;

  // Fetch pathfinder confidence data
  const { data: pathfinderRecords } = await supabase
    .from('pathfinder_confidence')
    .select('*')
    .eq('instance_connection_id', connectionId)
    .order('confidence_score', { ascending: false });

  const records = pathfinderRecords ?? [];

  // Fetch fusion findings (findings linked to pathfinder fusion rule categories)
  const fusionCategories = [
    'cmdb_traffic_mismatch_active_idle',
    'cmdb_traffic_mismatch_retired_active',
    'cmdb_class_mismatch',
    'shadow_it_detection',
    'relationship_unconfirmed',
  ];

  const { data: fusionFindings } = await supabase
    .from('findings')
    .select('*')
    .eq('assessment_id', id)
    .in('category', fusionCategories)
    .order('composite_score', { ascending: false });

  const fusionRows = fusionFindings ?? [];

  // If no Pathfinder data, show empty state
  if (records.length === 0) {
    return (
      <div className="space-y-8">
        {/* Breadcrumb */}
        <div>
          <div className="flex items-center gap-2 text-sm text-medium-gray mb-1">
            <Link href="/assessments" className="hover:text-white transition-colors">
              Assessments
            </Link>
            <span>&rsaquo;</span>
            <Link
              href={`/assessments/${id}`}
              className="hover:text-white transition-colors"
            >
              {customerName}
            </Link>
            <span>&rsaquo;</span>
            <span className="text-white">Pathfinder</span>
          </div>
          <h1 className="font-heading text-3xl font-bold text-white">
            Pathfinder Analysis
          </h1>
        </div>

        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <svg
              className="w-16 h-16 text-medium-gray/50 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.789m13.788 0c3.808 3.808 3.808 9.981 0 13.79M12 12h.008v.007H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
              />
            </svg>
            <h2 className="text-white font-heading text-xl font-semibold mb-2">
              No Pathfinder Data Available
            </h2>
            <p className="text-medium-gray text-sm max-w-md">
              Deploy Pathfinder agents on your network infrastructure to collect
              behavioral confidence data. Pathfinder uses eBPF/ETW-based observation
              to validate CMDB records against real network traffic patterns.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // Compute stats
  const activeCIs = records.filter((r: any) => r.traffic_state === 'active').length;
  const idleCIs = records.filter((r: any) => r.traffic_state === 'idle').length;
  const deprecatedCIs = records.filter((r: any) => r.traffic_state === 'deprecated').length;
  const unknownCIs = records.filter((r: any) => r.traffic_state === 'unknown').length;
  const totalCIs = records.length;

  // Coverage zone computation
  const fullyCovered = records.filter((r: any) => r.confidence_score > 50).length;
  const pathfinderOnly = records.filter((r: any) => r.confidence_score > 0 && r.confidence_score <= 50).length;
  const discoveryOnly = 0; // Would need full CMDB data to compute
  const dark = 0; // Would need full CMDB data to compute

  const zoneTotal = fullyCovered + pathfinderOnly + discoveryOnly + dark || 1;

  const zones = {
    fully_covered: {
      count: fullyCovered,
      percent: (fullyCovered / zoneTotal) * 100,
    },
    pathfinder_only: {
      count: pathfinderOnly,
      percent: (pathfinderOnly / zoneTotal) * 100,
    },
    discovery_only: {
      count: discoveryOnly,
      percent: (discoveryOnly / zoneTotal) * 100,
    },
    dark: {
      count: dark,
      percent: (dark / zoneTotal) * 100,
    },
  };

  // Recommendations based on data
  const recommendations: string[] = [];
  if (idleCIs > 0) {
    recommendations.push(
      `${idleCIs} CI(s) marked idle by Pathfinder may indicate stale CMDB records that need review.`
    );
  }
  if (deprecatedCIs > 0) {
    recommendations.push(
      `${deprecatedCIs} deprecated CI(s) detected. Verify these are properly decommissioned in the CMDB.`
    );
  }
  if (unknownCIs > 0) {
    recommendations.push(
      `${unknownCIs} CI(s) have unknown traffic state. These may require additional Pathfinder observation time.`
    );
  }
  if (fusionRows.length > 0) {
    recommendations.push(
      `${fusionRows.length} fusion finding(s) detected. These issues are only visible when combining Pathfinder behavioral data with CMDB assessment data.`
    );
  }

  // Shadow IT and misclassified counts
  const shadowITCount = fusionRows.filter(
    (f: any) => f.category === 'shadow_it_detection'
  ).length;
  const misclassifiedCount = fusionRows.filter(
    (f: any) => f.category === 'cmdb_class_mismatch'
  ).length;

  // Map records to ConfidenceTable props
  const tableRecords = records.map((r: any) => ({
    ciSysId: r.ci_sys_id,
    ciClass: r.ci_class ?? 'unknown',
    confidenceScore: r.confidence_score,
    trafficState: r.traffic_state,
    lastObservation: r.last_observation ?? '',
    observationCount: r.observation_count ?? 0,
    behavioralClassification: r.behavioral_classification ?? null,
  }));

  function severityVariant(severity: string): 'critical' | 'high' | 'medium' | 'low' | 'info' | 'default' {
    if (['critical', 'high', 'medium', 'low', 'info'].includes(severity)) {
      return severity as 'critical' | 'high' | 'medium' | 'low' | 'info';
    }
    return 'default';
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div>
        <div className="flex items-center gap-2 text-sm text-medium-gray mb-1">
          <Link href="/assessments" className="hover:text-white transition-colors">
            Assessments
          </Link>
          <span>&rsaquo;</span>
          <Link
            href={`/assessments/${id}`}
            className="hover:text-white transition-colors"
          >
            {customerName}
          </Link>
          <span>&rsaquo;</span>
          <span className="text-white">Pathfinder</span>
        </div>
        <h1 className="font-heading text-3xl font-bold text-white">
          Pathfinder Analysis
        </h1>
      </div>

      {/* Coverage Zone Map (full width) */}
      <CoverageZoneMap
        zones={zones}
        totalCIs={totalCIs}
        recommendations={recommendations}
      />

      {/* Stats summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-dark-gray rounded-xl p-4">
          <p className="text-medium-gray text-xs font-mono uppercase tracking-wider">Total CIs</p>
          <p className="text-white text-2xl font-bold font-heading mt-1">{totalCIs}</p>
        </div>
        <div className="bg-dark-gray rounded-xl p-4">
          <p className="text-medium-gray text-xs font-mono uppercase tracking-wider">Active</p>
          <p className="text-2xl font-bold font-heading mt-1" style={{ color: '#22C55E' }}>{activeCIs}</p>
        </div>
        <div className="bg-dark-gray rounded-xl p-4">
          <p className="text-medium-gray text-xs font-mono uppercase tracking-wider">Idle</p>
          <p className="text-2xl font-bold font-heading mt-1" style={{ color: '#EAB308' }}>{idleCIs}</p>
        </div>
        <div className="bg-dark-gray rounded-xl p-4">
          <p className="text-medium-gray text-xs font-mono uppercase tracking-wider">Deprecated</p>
          <p className="text-2xl font-bold font-heading mt-1" style={{ color: '#EF4444' }}>{deprecatedCIs}</p>
        </div>
        <div className="bg-dark-gray rounded-xl p-4">
          <p className="text-medium-gray text-xs font-mono uppercase tracking-wider">Shadow IT</p>
          <p className={`text-2xl font-bold font-heading mt-1 ${shadowITCount > 0 ? 'text-red-400' : 'text-medium-gray'}`}>
            {shadowITCount}
          </p>
        </div>
        <div className="bg-dark-gray rounded-xl p-4">
          <p className="text-medium-gray text-xs font-mono uppercase tracking-wider">Misclassified</p>
          <p className="text-2xl font-bold font-heading mt-1" style={{ color: '#F97316' }}>{misclassifiedCount}</p>
        </div>
      </div>

      {/* Confidence Table */}
      <section>
        <h2 className="font-heading text-xl font-semibold text-white mb-4">
          CI Confidence Records
        </h2>
        <ConfidenceTable records={tableRecords} />
      </section>

      {/* Fusion Findings */}
      {fusionRows.length > 0 && (
        <section>
          <h2 className="font-heading text-xl font-semibold text-white mb-4">
            Fusion Findings
          </h2>
          <p className="text-medium-gray text-sm mb-4">
            These findings are only detectable when combining Bearing assessment data with Pathfinder
            behavioral observations.
          </p>
          <div className="bg-dark-gray rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-obsidian">
                    <th className="px-4 py-3 text-left text-xs font-mono uppercase tracking-wider text-medium-gray">
                      Severity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-mono uppercase tracking-wider text-medium-gray">
                      Title
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-mono uppercase tracking-wider text-medium-gray">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-mono uppercase tracking-wider text-medium-gray">
                      Score
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-mono uppercase tracking-wider text-medium-gray">
                      Affected
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {fusionRows.map((f: any) => (
                    <tr
                      key={f.id}
                      className="border-b border-obsidian/50 hover:bg-obsidian/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Badge variant={severityVariant(f.severity)}>
                          {f.severity}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-white max-w-md">
                        <p className="truncate">{f.title}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-medium-gray">
                          {f.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-lime">
                          {Number(f.composite_score).toFixed(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-medium-gray">
                        {f.affected_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
