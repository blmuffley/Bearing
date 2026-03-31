import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { calculateRevenue } from '@/server/reporting/revenue-calculator';
import { HealthGauge } from '@/components/dashboard/HealthGauge';
import { RevenueSummary } from '@/components/dashboard/RevenueSummary';
import { DomainScoreCards } from '@/components/dashboard/DomainScoreCards';
import { FindingsTable } from '@/components/dashboard/FindingsTable';
import { PathfinderInsights } from '@/components/dashboard/PathfinderInsights';
import { CoverageZoneMap } from '@/components/dashboard/CoverageZoneMap';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { BenchmarkComparison } from '@/components/dashboard/BenchmarkComparison';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { Card } from '@/components/ui/Card';
import { ReportActions } from '@/components/reports/ReportActions';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AssessmentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  // Fetch assessment with its instance connection
  const { data: assessment, error: assessError } = await supabase
    .from('assessments')
    .select('*, instance_connections(customer_name, instance_url)')
    .eq('id', id)
    .single();

  if (assessError || !assessment) {
    notFound();
  }

  // Fetch findings for this assessment
  const { data: findings } = await supabase
    .from('findings')
    .select('*')
    .eq('assessment_id', id)
    .order('composite_score', { ascending: false });

  const findingRows = findings ?? [];

  // Fetch Pathfinder confidence data for this instance connection
  const connectionId = assessment.instance_connection_id;
  const { data: pathfinderRecords } = await supabase
    .from('pathfinder_confidence')
    .select('*')
    .eq('instance_connection_id', connectionId);

  const pfRecords = pathfinderRecords ?? [];
  const hasPathfinderData = pfRecords.length > 0;

  // Compute Pathfinder stats
  const activeCIs = pfRecords.filter((r: any) => r.traffic_state === 'active').length;
  const idleCIs = pfRecords.filter((r: any) => r.traffic_state === 'idle').length;
  const deprecatedCIs = pfRecords.filter((r: any) => r.traffic_state === 'deprecated').length;
  const totalPathfinderCIs = pfRecords.length;

  // Coverage zones: fully_covered = confidence > 50, pathfinder_only = confidence <= 50
  const fullyCovered = pfRecords.filter((r: any) => r.confidence_score > 50).length;
  const pathfinderOnly = pfRecords.filter((r: any) => r.confidence_score > 0 && r.confidence_score <= 50).length;
  const zoneTotal = fullyCovered + pathfinderOnly || 1;

  const coverageZones = {
    fully_covered: { count: fullyCovered, percent: (fullyCovered / zoneTotal) * 100 },
    pathfinder_only: { count: pathfinderOnly, percent: (pathfinderOnly / zoneTotal) * 100 },
    discovery_only: { count: 0, percent: 0 },
    dark: { count: 0, percent: 0 },
  };

  // Fusion finding categories
  const fusionCategories = [
    'cmdb_traffic_mismatch_active_idle',
    'cmdb_traffic_mismatch_retired_active',
    'cmdb_class_mismatch',
    'shadow_it_detection',
    'relationship_unconfirmed',
  ];
  const fusionFindingCount = findingRows.filter(
    (f: any) => fusionCategories.includes(f.category)
  ).length;
  const shadowITCount = findingRows.filter(
    (f: any) => f.category === 'shadow_it_detection'
  ).length;
  const misclassifiedCount = findingRows.filter(
    (f: any) => f.category === 'cmdb_class_mismatch'
  ).length;

  // Coverage recommendations
  const coverageRecommendations: string[] = [];
  if (hasPathfinderData && idleCIs > 0) {
    coverageRecommendations.push(
      `${idleCIs} CI(s) marked idle may indicate stale CMDB records.`
    );
  }
  if (hasPathfinderData && deprecatedCIs > 0) {
    coverageRecommendations.push(
      `${deprecatedCIs} deprecated CI(s) detected. Verify decommission status.`
    );
  }

  // Fetch previous assessments for the same instance connection (trend data)
  const { data: trendAssessments } = await supabase
    .from('assessments')
    .select('id, health_score, created_at, status')
    .eq('instance_connection_id', connectionId)
    .eq('status', 'complete')
    .order('created_at', { ascending: true })
    .limit(10);

  const trendRows = trendAssessments ?? [];

  // Build trend data points
  const trendDataPoints = await Promise.all(
    trendRows.map(async (a: any) => {
      const { count: findingCount } = await supabase
        .from('findings')
        .select('*', { count: 'exact', head: true })
        .eq('assessment_id', a.id);
      const { count: criticalCount } = await supabase
        .from('findings')
        .select('*', { count: 'exact', head: true })
        .eq('assessment_id', a.id)
        .eq('severity', 'critical');
      return {
        date: a.created_at,
        healthScore: a.health_score ?? 0,
        findingCount: findingCount ?? 0,
        criticalCount: criticalCount ?? 0,
      };
    })
  );

  // Generate alerts by comparing current vs previous assessment
  type AlertItem = {
    type: string;
    severity: 'critical' | 'warning' | 'info';
    message: string;
    currentValue: number;
    previousValue?: number;
    delta?: number;
  };
  const alerts: AlertItem[] = [];

  if (trendRows.length >= 2) {
    const currentAssessment = trendRows[trendRows.length - 1];
    const previousAssessment = trendRows[trendRows.length - 2];
    const currentHealth = currentAssessment.health_score ?? 0;
    const previousHealth = previousAssessment.health_score ?? 0;
    const healthDelta = currentHealth - previousHealth;

    if (healthDelta < -10) {
      alerts.push({
        type: 'score_drop',
        severity: 'critical',
        message: `Health score dropped ${Math.abs(healthDelta)} points since last assessment.`,
        currentValue: currentHealth,
        previousValue: previousHealth,
        delta: healthDelta,
      });
    } else if (healthDelta < -3) {
      alerts.push({
        type: 'score_drop',
        severity: 'warning',
        message: `Health score decreased by ${Math.abs(healthDelta)} points since last assessment.`,
        currentValue: currentHealth,
        previousValue: previousHealth,
        delta: healthDelta,
      });
    } else if (healthDelta > 5) {
      alerts.push({
        type: 'score_improvement',
        severity: 'info',
        message: `Health score improved by ${healthDelta} points since last assessment.`,
        currentValue: currentHealth,
        previousValue: previousHealth,
        delta: healthDelta,
      });
    }

    // Check for new critical findings
    const currentCriticals = findingRows.filter((f: any) => f.severity === 'critical').length;
    const { count: prevCriticalCount } = await supabase
      .from('findings')
      .select('*', { count: 'exact', head: true })
      .eq('assessment_id', previousAssessment.id)
      .eq('severity', 'critical');

    const criticalDelta = currentCriticals - (prevCriticalCount ?? 0);
    if (criticalDelta > 0) {
      alerts.push({
        type: 'new_criticals',
        severity: 'critical',
        message: `${criticalDelta} new critical finding(s) detected since last assessment.`,
        currentValue: currentCriticals,
        previousValue: prevCriticalCount ?? 0,
        delta: criticalDelta,
      });
    }
  }

  // Map DB rows to the shape expected by the revenue calculator
  const revenueFindingInputs = findingRows.map((f: any) => ({
    id: f.id,
    title: f.title,
    severity: f.severity,
    effortTshirt: f.effort_tshirt,
    effortHoursLow: f.effort_hours_low,
    effortHoursHigh: f.effort_hours_high,
    affectedCount: f.affected_count,
    riskScore: f.risk_score,
    module: f.module,
    compositeScore: Number(f.composite_score),
  }));

  // Default rate card (blended rate of $200/hr) until org settings are wired
  const defaultRateCard = {
    roles: [],
    defaultEngagementType: 'time_and_materials' as const,
    blendedRate: 200,
  };

  const revenue = calculateRevenue(revenueFindingInputs, defaultRateCard);

  // Build domain scores and finding counts from DB data
  const domainScores: Record<string, number> = assessment.domain_scores ?? {};
  const findingCounts: Record<string, number> = {};
  for (const f of findingRows) {
    const mod = (f as any).module ?? 'unknown';
    findingCounts[mod] = (findingCounts[mod] ?? 0) + 1;
  }

  // Map findings to the shape expected by FindingsTable
  const tableFindingRows = findingRows.map((f: any) => ({
    id: f.id,
    title: f.title,
    module: f.module,
    severity: f.severity,
    effortTshirt: f.effort_tshirt,
    compositeScore: Number(f.composite_score),
    affectedCount: f.affected_count,
    remediationDescription: f.remediation_description,
  }));

  const customerName =
    (assessment.instance_connections as any)?.customer_name ?? 'Assessment';

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <Link
          href="/assessments"
          className="text-medium-gray text-sm hover:text-white transition-colors mb-1 inline-block"
        >
          &larr; Assessments
        </Link>
        <h1 className="font-heading text-3xl font-bold text-white">
          {customerName}
        </h1>
      </div>

      {/* Action buttons: Reports & SOW */}
      <ReportActions assessmentId={id} />

      {/* Top section: Health Gauge + Revenue Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="flex items-center justify-center lg:col-span-1">
          <HealthGauge
            score={assessment.health_score ?? 0}
            label="Instance Health"
            size="lg"
          />
        </Card>
        <div className="lg:col-span-2">
          <RevenueSummary
            totalRevenueLow={revenue.totalRevenueLow}
            totalRevenueHigh={revenue.totalRevenueHigh}
            totalHoursLow={revenue.totalHoursLow}
            totalHoursHigh={revenue.totalHoursHigh}
            quickWinCount={revenue.quickWins.length}
            quickWinRevenue={revenue.quickWins.reduce(
              (sum, qw) => sum + qw.revenueLow,
              0,
            )}
          />
        </div>
      </div>

      {/* Domain score cards */}
      {Object.keys(domainScores).length > 0 && (
        <section>
          <h2 className="font-heading text-xl font-semibold text-white mb-4">
            Domain Health
          </h2>
          <DomainScoreCards
            scores={domainScores}
            findingCounts={findingCounts}
          />
        </section>
      )}

      {/* Pathfinder section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-xl font-semibold text-white">
            Pathfinder
          </h2>
          {hasPathfinderData && (
            <Link
              href={`/assessments/${id}/pathfinder`}
              className="text-sm text-lime hover:text-lime/80 transition-colors"
            >
              View Details &rarr;
            </Link>
          )}
        </div>
        <div className="space-y-6">
          <PathfinderInsights
            fusionFindingCount={fusionFindingCount}
            totalPathfinderCIs={totalPathfinderCIs}
            activeCIs={activeCIs}
            idleCIs={idleCIs}
            deprecatedCIs={deprecatedCIs}
            shadowITCount={shadowITCount}
            misclassifiedCount={misclassifiedCount}
            hasPathfinderData={hasPathfinderData}
          />
          {hasPathfinderData && (
            <CoverageZoneMap
              zones={coverageZones}
              totalCIs={totalPathfinderCIs}
              recommendations={coverageRecommendations}
            />
          )}
        </div>
      </section>

      {/* Trends & Benchmarks */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-xl font-semibold text-white">
            Trends &amp; Benchmarks
          </h2>
          <Link
            href={`/assessments/${id}/trends`}
            className="text-sm text-lime hover:text-lime/80 transition-colors"
          >
            View Details &rarr;
          </Link>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TrendChart dataPoints={trendDataPoints} />
          <BenchmarkComparison currentScore={assessment.health_score ?? 0} benchmarks={null} />
        </div>
      </section>

      {/* Monitoring Alerts */}
      {alerts.length > 0 && (
        <section>
          <AlertsPanel alerts={alerts} />
        </section>
      )}

      {/* Findings table */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-xl font-semibold text-white">
            Findings
          </h2>
          {tableFindingRows.length > 0 && (
            <Link
              href={`/assessments/${id}/findings`}
              className="text-sm text-lime hover:text-lime/80 transition-colors"
            >
              View all findings &rarr;
            </Link>
          )}
        </div>
        <FindingsTable findings={tableFindingRows} />
      </section>
    </div>
  );
}
