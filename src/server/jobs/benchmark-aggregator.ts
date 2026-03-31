import type { SupabaseClient } from '@supabase/supabase-js';
import type { CompanySizeTier, Module } from '@/types/assessment';
import type { Severity } from '@/types/finding';

/**
 * Anonymized cohort benchmark data for a module.
 */
export interface CohortBenchmark {
  module: string;
  cohortSize: number;
  avgHealthScore: number;
  medianHealthScore: number;
  p25HealthScore: number;
  p75HealthScore: number;
  avgFindingCounts: Record<string, number>;
}

/** Minimum number of assessments required before cohort data is surfaced. */
const MIN_COHORT_SIZE = 10;

/**
 * After each assessment completes, anonymize and aggregate data for
 * benchmarking. Cohort statistics are only surfaced when the minimum
 * cohort size is met to protect individual customer data.
 */
export class BenchmarkAggregator {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Anonymize and store per-module benchmark data for a completed assessment.
   *
   * - Fetches the assessment and its findings.
   * - Groups findings by module and counts by severity.
   * - Inserts a benchmark_data row per module with anonymized = true.
   */
  async aggregateAssessment(
    assessmentId: string,
    metadata?: {
      industryVertical?: string;
      companySizeTier?: CompanySizeTier;
    },
  ): Promise<void> {
    // Fetch the assessment (for scan_metadata and domain_scores)
    const { data: assessment, error: assessmentError } = await this.supabase
      .from('assessments')
      .select('id, domain_scores, scan_metadata, modules_enabled')
      .eq('id', assessmentId)
      .single();

    if (assessmentError || !assessment) {
      throw new Error(
        `Failed to fetch assessment ${assessmentId}: ${assessmentError?.message ?? 'not found'}`,
      );
    }

    // Fetch all findings for the assessment
    const { data: findings, error: findingsError } = await this.supabase
      .from('findings')
      .select('module, severity')
      .eq('assessment_id', assessmentId);

    if (findingsError) {
      throw new Error(
        `Failed to fetch findings for assessment ${assessmentId}: ${findingsError.message}`,
      );
    }

    // Group findings by module and count by severity
    const moduleFindings: Record<string, Partial<Record<Severity, number>>> = {};

    for (const finding of findings ?? []) {
      const mod = finding.module as string;
      if (!moduleFindings[mod]) {
        moduleFindings[mod] = {};
      }
      const sev = finding.severity as Severity;
      moduleFindings[mod][sev] = (moduleFindings[mod][sev] ?? 0) + 1;
    }

    const servicenowVersion =
      (assessment.scan_metadata as Record<string, unknown>)?.servicenow_version as
        | string
        | undefined;

    const domainScores = (assessment.domain_scores ?? {}) as Record<string, number>;
    const modulesEnabled = (assessment.modules_enabled ?? []) as string[];

    // Ensure we have an entry for every enabled module, even if no findings
    for (const mod of modulesEnabled) {
      if (!moduleFindings[mod]) {
        moduleFindings[mod] = {};
      }
    }

    // Insert a benchmark_data row per module
    const rows = Object.entries(moduleFindings).map(([mod, counts]) => ({
      assessment_id: assessmentId,
      industry_vertical: metadata?.industryVertical ?? null,
      company_size_tier: metadata?.companySizeTier ?? null,
      servicenow_version: servicenowVersion ?? null,
      module: mod,
      health_score: domainScores[mod] ?? 100,
      finding_counts: counts,
      anonymized: true,
    }));

    if (rows.length === 0) return;

    const { error: insertError } = await this.supabase
      .from('benchmark_data')
      .insert(rows);

    if (insertError) {
      throw new Error(
        `Failed to insert benchmark data for assessment ${assessmentId}: ${insertError.message}`,
      );
    }
  }

  /**
   * Retrieve cohort benchmark statistics for a given module with optional
   * filters. Returns null if the cohort size is below the minimum threshold.
   */
  async getCohortBenchmarks(params: {
    module: string;
    industryVertical?: string;
    companySizeTier?: string;
    servicenowVersion?: string;
  }): Promise<CohortBenchmark | null> {
    let query = this.supabase
      .from('benchmark_data')
      .select('health_score, finding_counts')
      .eq('module', params.module)
      .eq('anonymized', true);

    if (params.industryVertical) {
      query = query.eq('industry_vertical', params.industryVertical);
    }
    if (params.companySizeTier) {
      query = query.eq('company_size_tier', params.companySizeTier);
    }
    if (params.servicenowVersion) {
      query = query.eq('servicenow_version', params.servicenowVersion);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to query benchmark data: ${error.message}`);
    }

    if (!data || data.length < MIN_COHORT_SIZE) {
      return null;
    }

    // Compute statistics
    const scores = data
      .map((d) => d.health_score as number)
      .sort((a, b) => a - b);

    const cohortSize = scores.length;
    const avgHealthScore =
      Math.round(scores.reduce((s, v) => s + v, 0) / cohortSize);
    const medianHealthScore = percentile(scores, 50);
    const p25HealthScore = percentile(scores, 25);
    const p75HealthScore = percentile(scores, 75);

    // Aggregate finding counts across the cohort
    const totalCounts: Record<string, number> = {};
    for (const row of data) {
      const counts = (row.finding_counts ?? {}) as Record<string, number>;
      for (const [severity, count] of Object.entries(counts)) {
        totalCounts[severity] = (totalCounts[severity] ?? 0) + count;
      }
    }

    const avgFindingCounts: Record<string, number> = {};
    for (const [severity, total] of Object.entries(totalCounts)) {
      avgFindingCounts[severity] = Math.round((total / cohortSize) * 10) / 10;
    }

    return {
      module: params.module,
      cohortSize,
      avgHealthScore,
      medianHealthScore,
      p25HealthScore,
      p75HealthScore,
      avgFindingCounts,
    };
  }
}

/**
 * Compute the p-th percentile of a sorted numeric array.
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return Math.round(
    sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower),
  );
}
