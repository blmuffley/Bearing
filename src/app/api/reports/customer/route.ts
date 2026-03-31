import { NextRequest, NextResponse } from 'next/server';
import { generateCustomerReport } from '@/server/reporting/customer-report';
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
 * POST /api/reports/customer
 *
 * Generates a customer-facing report DOCX (white-labeled, no pricing).
 *
 * Request body (JSON):
 *   - assessmentId: UUID of the assessment
 *   - branding?: { orgName?, primaryColor?, secondaryColor?, legalText? }
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
    const brandingInput = body.branding as
      | { orgName?: string; primaryColor?: string; secondaryColor?: string; legalText?: string }
      | undefined;

    if (!assessmentId || typeof assessmentId !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: assessmentId' },
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

    const branding = {
      orgName: brandingInput?.orgName || 'Avennorth',
      primaryColor: brandingInput?.primaryColor,
      secondaryColor: brandingInput?.secondaryColor,
      legalText: brandingInput?.legalText,
    };

    // -----------------------------------------------------------------------
    // 3. Generate the DOCX
    // -----------------------------------------------------------------------
    const buffer = await generateCustomerReport({
      assessment,
      findings,
      branding,
    });

    // -----------------------------------------------------------------------
    // 4. Return the DOCX as a file download
    // -----------------------------------------------------------------------
    const safeCustomerName = assessment.customerName.replace(/[^a-zA-Z0-9_-]/g, '_');
    return docxResponse(buffer, `customer-report-${safeCustomerName}.docx`);
  } catch (err) {
    console.error('[reports/customer] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
