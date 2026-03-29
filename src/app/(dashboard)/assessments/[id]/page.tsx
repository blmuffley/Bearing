import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { calculateRevenue } from '@/server/reporting/revenue-calculator';
import { HealthGauge } from '@/components/dashboard/HealthGauge';
import { RevenueSummary } from '@/components/dashboard/RevenueSummary';
import { DomainScoreCards } from '@/components/dashboard/DomainScoreCards';
import { FindingsTable } from '@/components/dashboard/FindingsTable';
import { Card } from '@/components/ui/Card';

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
