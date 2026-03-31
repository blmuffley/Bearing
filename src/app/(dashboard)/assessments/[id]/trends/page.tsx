import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { BenchmarkComparison } from '@/components/dashboard/BenchmarkComparison';
import { CalibrationInsights } from '@/components/dashboard/CalibrationInsights';
import { Card } from '@/components/ui/Card';
import { AssessmentComparisonTable } from './AssessmentComparisonTable';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TrendsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  // Fetch current assessment
  const { data: assessment, error } = await supabase
    .from('assessments')
    .select('*, instance_connections(customer_name, instance_url)')
    .eq('id', id)
    .single();

  if (error || !assessment) {
    notFound();
  }

  const connectionId = assessment.instance_connection_id;
  const customerName =
    (assessment.instance_connections as any)?.customer_name ?? 'Assessment';

  // Fetch ALL assessments for this connection
  const { data: allAssessments } = await supabase
    .from('assessments')
    .select('id, health_score, domain_scores, created_at, status')
    .eq('instance_connection_id', connectionId)
    .eq('status', 'complete')
    .order('created_at', { ascending: true });

  const assessmentRows = allAssessments ?? [];

  // Build trend data points with finding counts
  const trendDataPoints = await Promise.all(
    assessmentRows.map(async (a: any) => {
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

  // Fetch finding counts per severity for each assessment (for comparison table)
  const comparisonData = await Promise.all(
    assessmentRows.map(async (a: any) => {
      const { data: findings } = await supabase
        .from('findings')
        .select('severity')
        .eq('assessment_id', a.id);
      const rows = findings ?? [];
      const severityCounts: Record<string, number> = {};
      for (const f of rows) {
        severityCounts[f.severity] = (severityCounts[f.severity] ?? 0) + 1;
      }
      return {
        id: a.id,
        healthScore: a.health_score ?? 0,
        domainScores: a.domain_scores ?? {},
        createdAt: a.created_at,
        totalFindings: rows.length,
        criticalCount: severityCounts['critical'] ?? 0,
        highCount: severityCounts['high'] ?? 0,
        mediumCount: severityCounts['medium'] ?? 0,
        lowCount: severityCounts['low'] ?? 0,
      };
    })
  );

  // Fetch calibration data from remediation_patterns
  const { data: remediationPatterns } = await supabase
    .from('remediation_patterns')
    .select('pattern_key, display_name, calibration_factor, calibration_sample_size');

  const calibrationFactors = (remediationPatterns ?? []).map((rp: any) => ({
    patternKey: rp.pattern_key,
    displayName: rp.display_name,
    factor: Number(rp.calibration_factor) || 1.0,
    sampleSize: rp.calibration_sample_size ?? 0,
    avgAccuracy: rp.calibration_factor
      ? Math.round(100 - Math.abs(1 - Number(rp.calibration_factor)) * 100)
      : 0,
  }));

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
        <h1 className="font-heading text-3xl font-bold text-white">
          Trends &amp; Benchmarks
        </h1>
        <p className="text-medium-gray text-sm mt-1">{customerName}</p>
      </div>

      {/* Full-width Trend Chart */}
      <section>
        <TrendChart dataPoints={trendDataPoints} />
      </section>

      {/* Benchmark + Calibration side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BenchmarkComparison
          currentScore={assessment.health_score ?? 0}
          benchmarks={null}
        />
        <CalibrationInsights factors={calibrationFactors} />
      </div>

      {/* Assessment Comparison Table */}
      <section>
        <h2 className="font-heading text-xl font-semibold text-white mb-4">
          Assessment Comparison
        </h2>
        <AssessmentComparisonTable assessments={comparisonData} />
      </section>
    </div>
  );
}
