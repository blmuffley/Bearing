import { NextRequest, NextResponse } from 'next/server';
import { generateConsultantReport } from '@/server/reporting/consultant-report';
import {
  createServiceClient,
  docxResponse,
  fetchAssessment,
  fetchFindings,
  mapAssessment,
  mapFinding,
} from '../_shared';

// TODO: Replace with authenticated user's org_id once auth is wired up.

/**
 * POST /api/reports/consultant
 *
 * Generates an internal consultant report DOCX with pricing and margin analysis.
 *
 * Request body (JSON):
 *   - assessmentId: UUID of the assessment
 *   - rateCard: { blendedRate, roles?, marginTarget? }
 *   - orgName?: consulting firm name (defaults to "Avennorth")
 */
export async function POST(request: NextRequest) {
  try {
    // -----------------------------------------------------------------------
    // 1. Parse request body
    // -----------------------------------------------------------------------
    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 },
      );
    }

    const assessmentId = body.assessmentId as string | undefined;
    const rateCard = body.rateCard as
      | { blendedRate: number; roles?: Array<{ name: string; hourlyRate: number }>; marginTarget?: number }
      | undefined;
    const orgName = (body.orgName as string) || 'Avennorth';

    if (!assessmentId || typeof assessmentId !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: assessmentId' },
        { status: 400 },
      );
    }

    if (!rateCard || typeof rateCard.blendedRate !== 'number') {
      return NextResponse.json(
        { error: 'Missing required field: rateCard.blendedRate' },
        { status: 400 },
      );
    }

    // -----------------------------------------------------------------------
    // 2. Fetch assessment and findings from Supabase
    // -----------------------------------------------------------------------
    const supabase = createServiceClient();

    const assessmentRow = await fetchAssessment(supabase, assessmentId);
    if (!assessmentRow) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 },
      );
    }

    const findingRows = await fetchFindings(supabase, assessmentId);
    const assessment = mapAssessment(assessmentRow as Record<string, unknown>);
    const findings = findingRows.map((r) => mapFinding(r as Record<string, unknown>));

    // -----------------------------------------------------------------------
    // 3. Generate the DOCX
    // -----------------------------------------------------------------------
    const buffer = await generateConsultantReport({
      assessment,
      findings,
      rateCard: {
        blendedRate: rateCard.blendedRate,
        roles: rateCard.roles,
        marginTarget: rateCard.marginTarget,
      },
      orgName,
    });

    // -----------------------------------------------------------------------
    // 4. Return the DOCX as a file download
    // -----------------------------------------------------------------------
    const safeCustomerName = assessment.customerName.replace(/[^a-zA-Z0-9_-]/g, '_');
    return docxResponse(buffer, `consultant-report-${safeCustomerName}.docx`);
  } catch (err) {
    console.error('[reports/consultant] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
