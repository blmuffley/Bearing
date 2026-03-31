import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Create a Supabase service-role client for API routes that operate
 * outside of an authenticated user session.
 *
 * TODO: Replace with authenticated user's session client once auth is wired up.
 */
export function createServiceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * Build a NextResponse that delivers a DOCX buffer as a file download.
 */
export function docxResponse(buffer: Buffer, filename: string): NextResponse {
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    },
  });
}

/**
 * Fetch an assessment by ID, including the related instance_connection for
 * customer name and instance URL.
 *
 * Returns null if not found.
 */
export async function fetchAssessment(supabase: SupabaseClient, assessmentId: string) {
  const { data, error } = await supabase
    .from('assessments')
    .select(`
      id,
      health_score,
      domain_scores,
      scan_metadata,
      completed_at,
      instance_connections (
        customer_name,
        instance_url
      )
    `)
    .eq('id', assessmentId)
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * Fetch all findings for a given assessment, ordered by composite score descending.
 */
export async function fetchFindings(supabase: SupabaseClient, assessmentId: string) {
  const { data, error } = await supabase
    .from('findings')
    .select('*')
    .eq('assessment_id', assessmentId)
    .order('composite_score', { ascending: false });

  if (error || !data) return [];
  return data;
}

/**
 * Fetch findings by specific IDs, ordered by composite score descending.
 */
export async function fetchFindingsByIds(
  supabase: SupabaseClient,
  assessmentId: string,
  findingIds: string[],
) {
  const { data, error } = await supabase
    .from('findings')
    .select('*')
    .eq('assessment_id', assessmentId)
    .in('id', findingIds)
    .order('composite_score', { ascending: false });

  if (error || !data) return [];
  return data;
}

/**
 * Map a database finding row to the shape expected by the report generators.
 */
export function mapFinding(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    module: row.module as string,
    category: row.category as string,
    severity: row.severity as string,
    effortTshirt: row.effort_tshirt as string,
    effortHoursLow: row.effort_hours_low as number,
    effortHoursHigh: row.effort_hours_high as number,
    riskScore: row.risk_score as number,
    compositeScore: row.composite_score as number,
    affectedCount: row.affected_count as number,
    remediationDescription: row.remediation_description as string,
    remediationPattern: row.remediation_pattern as string,
  };
}

/**
 * Map a database assessment row (with joined instance_connections) to the
 * shape expected by the report generators.
 */
export function mapAssessment(row: Record<string, unknown>) {
  const conn = row.instance_connections as Record<string, unknown> | null;
  return {
    id: row.id as string,
    customerName: (conn?.customer_name as string) ?? 'Unknown Customer',
    instanceUrl: (conn?.instance_url as string) ?? '',
    healthScore: (row.health_score as number) ?? 0,
    domainScores: (row.domain_scores as Record<string, number>) ?? {},
    scanDate: (row.completed_at as string) ?? new Date().toISOString(),
    instanceVersion:
      ((row.scan_metadata as Record<string, unknown>)?.instanceVersion as string) ??
      undefined,
  };
}
