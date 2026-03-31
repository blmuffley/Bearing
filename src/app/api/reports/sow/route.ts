import { NextRequest, NextResponse } from 'next/server';
import { generateSow } from '@/server/reporting/sow-generator';
import type { EngagementType } from '@/types/sow';
import {
  createServiceClient,
  docxResponse,
  fetchAssessment,
  fetchFindingsByIds,
  mapAssessment,
  mapFinding,
} from '../_shared';

// TODO: Replace with authenticated user's org_id once auth is wired up.

/**
 * POST /api/reports/sow
 *
 * Generates a Statement of Work DOCX from selected findings.
 *
 * Request body (JSON):
 *   - assessmentId: UUID of the assessment
 *   - selectedFindingIds: array of finding UUIDs to include
 *   - engagementType: 'time_and_materials' | 'fixed_fee' | 'blended'
 *   - rateCard: { blendedRate, roles?, marginTarget? }
 *   - preparedBy: name of the person preparing the SOW
 *   - timeline?: { startDate, durationWeeks }
 *   - branding?: { primaryColor?, legalText? }
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
    const selectedFindingIds = body.selectedFindingIds as string[] | undefined;
    const engagementType = body.engagementType as EngagementType | undefined;
    const rateCard = body.rateCard as
      | { blendedRate: number; roles?: Array<{ name: string; hourlyRate: number }>; marginTarget?: number }
      | undefined;
    const preparedBy = body.preparedBy as string | undefined;
    const timeline = body.timeline as
      | { startDate: string; durationWeeks: number }
      | undefined;
    const brandingInput = body.branding as
      | { primaryColor?: string; legalText?: string }
      | undefined;
    const orgName = (body.orgName as string) || 'Avennorth';

    // Validate required fields
    if (!assessmentId || typeof assessmentId !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: assessmentId' },
        { status: 400 },
      );
    }

    if (!Array.isArray(selectedFindingIds) || selectedFindingIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty required field: selectedFindingIds' },
        { status: 400 },
      );
    }

    const validEngagementTypes: EngagementType[] = [
      'time_and_materials',
      'fixed_fee',
      'blended',
    ];
    if (!engagementType || !validEngagementTypes.includes(engagementType)) {
      return NextResponse.json(
        { error: 'Missing or invalid required field: engagementType' },
        { status: 400 },
      );
    }

    if (!rateCard || typeof rateCard.blendedRate !== 'number') {
      return NextResponse.json(
        { error: 'Missing required field: rateCard.blendedRate' },
        { status: 400 },
      );
    }

    if (!preparedBy || typeof preparedBy !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: preparedBy' },
        { status: 400 },
      );
    }

    // -----------------------------------------------------------------------
    // 2. Fetch assessment and selected findings from Supabase
    // -----------------------------------------------------------------------
    const supabase = createServiceClient();

    const assessmentRow = await fetchAssessment(supabase, assessmentId);
    if (!assessmentRow) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 },
      );
    }

    const findingRows = await fetchFindingsByIds(
      supabase,
      assessmentId,
      selectedFindingIds,
    );

    if (findingRows.length === 0) {
      return NextResponse.json(
        { error: 'No findings found for the provided IDs' },
        { status: 404 },
      );
    }

    const assessment = mapAssessment(assessmentRow as Record<string, unknown>);
    const findings = findingRows.map((r) => mapFinding(r as Record<string, unknown>));

    // -----------------------------------------------------------------------
    // 3. Fetch remediation patterns for the selected findings
    // -----------------------------------------------------------------------
    const uniquePatternKeys = [
      ...new Set(findings.map((f) => f.remediationPattern).filter(Boolean)),
    ];

    let remediationPatterns: Array<{
      patternKey: string;
      displayName: string;
      sowScopeTemplate?: string;
      sowAssumptions?: string;
      sowDeliverables?: string[];
      sowExclusions?: string;
      requiredRoles?: string[];
    }> = [];

    if (uniquePatternKeys.length > 0) {
      const { data: patterns } = await supabase
        .from('remediation_patterns')
        .select(
          'pattern_key, display_name, sow_scope_template, sow_assumptions, sow_deliverables, sow_exclusions, required_roles',
        )
        .in('pattern_key', uniquePatternKeys);

      if (patterns) {
        remediationPatterns = patterns.map((p) => ({
          patternKey: p.pattern_key as string,
          displayName: p.display_name as string,
          sowScopeTemplate: p.sow_scope_template as string | undefined,
          sowAssumptions: p.sow_assumptions as string | undefined,
          sowDeliverables: p.sow_deliverables as string[] | undefined,
          sowExclusions: p.sow_exclusions as string | undefined,
          requiredRoles: p.required_roles as string[] | undefined,
        }));
      }
    }

    // -----------------------------------------------------------------------
    // 4. Generate the SOW DOCX
    // -----------------------------------------------------------------------
    const buffer = await generateSow({
      customerName: assessment.customerName,
      orgName,
      preparedBy,
      date: new Date().toISOString(),
      engagementType,
      findings,
      remediationPatterns,
      rateCard: {
        blendedRate: rateCard.blendedRate,
        roles: rateCard.roles,
        marginTarget: rateCard.marginTarget,
      },
      timeline,
      branding: brandingInput,
    });

    // -----------------------------------------------------------------------
    // 5. Return the DOCX as a file download
    // -----------------------------------------------------------------------
    const safeCustomerName = assessment.customerName.replace(/[^a-zA-Z0-9_-]/g, '_');
    return docxResponse(buffer, `sow-${safeCustomerName}.docx`);
  } catch (err) {
    console.error('[reports/sow] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
