import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseExportPayload } from '@/server/scanner/export-parser';
import { ScanEngine } from '@/server/scanner/engine';

// TODO: Replace with authenticated user's org_id once auth is wired up.
const DEMO_ORG_ID = '00000000-0000-0000-0000-000000000000';

/**
 * POST /api/export/upload
 *
 * Accepts a multipart form upload containing:
 *   - file: The sanitized ServiceNow export JSON (.json)
 *   - customerName: Display name for the customer
 *   - instanceUrl: (optional) The ServiceNow instance URL
 *   - orgId: (optional) Organization ID — defaults to demo org until auth is wired
 *
 * Runs the scan engine, persists results to Supabase, and returns the
 * real assessment ID from the database.
 */
export async function POST(request: NextRequest) {
  try {
    // -----------------------------------------------------------------------
    // 1. Parse multipart form data
    // -----------------------------------------------------------------------
    const formData = await request.formData();

    const file = formData.get('file');
    const customerName = formData.get('customerName');
    const instanceUrl = formData.get('instanceUrl');
    const orgIdField = formData.get('orgId');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Missing required field: file' },
        { status: 400 },
      );
    }

    if (!customerName || typeof customerName !== 'string' || !customerName.trim()) {
      return NextResponse.json(
        { error: 'Missing required field: customerName' },
        { status: 400 },
      );
    }

    if (!file.name.endsWith('.json')) {
      return NextResponse.json(
        { error: 'Only .json files are accepted' },
        { status: 400 },
      );
    }

    // TODO: Derive org_id from the authenticated user's session once auth is wired.
    const orgId =
      typeof orgIdField === 'string' && orgIdField.trim()
        ? orgIdField.trim()
        : DEMO_ORG_ID;

    // -----------------------------------------------------------------------
    // 2. Read and parse the JSON file
    // -----------------------------------------------------------------------
    let rawJson: unknown;

    try {
      const text = await file.text();
      rawJson = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: 'File is not valid JSON' },
        { status: 400 },
      );
    }

    // -----------------------------------------------------------------------
    // 3. Validate against the export payload schema
    // -----------------------------------------------------------------------
    let payload;

    try {
      payload = parseExportPayload(rawJson);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Export payload validation failed';
      return NextResponse.json(
        { error: `Invalid export format: ${message}` },
        { status: 422 },
      );
    }

    // -----------------------------------------------------------------------
    // 4. Run the scan engine
    // -----------------------------------------------------------------------
    const engine = new ScanEngine();
    const scanResult = await engine.runExportScan(payload);

    // -----------------------------------------------------------------------
    // 5. Persist results to Supabase
    // -----------------------------------------------------------------------
    const resolvedInstanceUrl =
      typeof instanceUrl === 'string' && instanceUrl.trim()
        ? instanceUrl.trim()
        : payload.metadata.instance_url;

    // Use a service-role client so we can write without an authenticated user session.
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    try {
      // 5a. Find or create instance_connection
      let connectionId: string;

      const { data: existingConn } = await serviceClient
        .from('instance_connections')
        .select('id')
        .eq('org_id', orgId)
        .eq('customer_name', customerName.trim())
        .eq('instance_url', resolvedInstanceUrl)
        .eq('connection_type', 'export')
        .limit(1)
        .single();

      if (existingConn) {
        connectionId = existingConn.id;
      } else {
        const { data: newConn, error: connError } = await serviceClient
          .from('instance_connections')
          .insert({
            org_id: orgId,
            customer_name: customerName.trim(),
            instance_url: resolvedInstanceUrl,
            connection_type: 'export',
            status: 'active',
          })
          .select('id')
          .single();

        if (connError || !newConn) {
          console.error('[export/upload] Failed to create instance_connection:', connError);
          return NextResponse.json(
            { error: 'Failed to persist connection record' },
            { status: 500 },
          );
        }

        connectionId = newConn.id;
      }

      // 5b. Create assessment record
      const modulesEnabled = Object.keys(scanResult.domainScores);

      const { data: assessment, error: assessError } = await serviceClient
        .from('assessments')
        .insert({
          org_id: orgId,
          instance_connection_id: connectionId,
          scan_type: 'export_ingest',
          status: 'complete',
          modules_enabled: modulesEnabled,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          health_score: scanResult.healthScore,
          domain_scores: scanResult.domainScores,
          scan_metadata: scanResult.scanMetadata,
        })
        .select('id')
        .single();

      if (assessError || !assessment) {
        console.error('[export/upload] Failed to create assessment:', assessError);
        return NextResponse.json(
          { error: 'Failed to persist assessment record' },
          { status: 500 },
        );
      }

      // 5c. Insert all findings
      if (scanResult.findings.length > 0) {
        const findingRows = scanResult.findings.map((f) => ({
          org_id: orgId,
          assessment_id: assessment.id,
          module: f.ruleKey.split('_')[0] ?? 'core',
          category: f.ruleKey,
          severity: f.severity,
          severity_score: f.severityScore,
          effort_tshirt: f.effortTshirt,
          effort_hours_low: f.effortHoursLow,
          effort_hours_high: f.effortHoursHigh,
          risk_score: f.riskScore,
          composite_score: f.compositeScore,
          title: f.title,
          description: f.description,
          evidence: f.evidence,
          remediation_pattern: f.remediationPattern,
          remediation_description: f.remediationDescription,
          affected_count: f.affectedCount,
          pathfinder_relevant: f.pathfinderRelevant,
          pathfinder_recommendation: f.pathfinderRecommendation ?? null,
        }));

        const { error: findingsError } = await serviceClient
          .from('findings')
          .insert(findingRows);

        if (findingsError) {
          console.error('[export/upload] Failed to insert findings:', findingsError);
          // Assessment was created, but findings failed — log and continue
          // so the user can still see partial results.
        }
      }

      // -----------------------------------------------------------------------
      // 6. Return response with the real assessment ID
      // -----------------------------------------------------------------------
      return NextResponse.json({
        assessmentId: assessment.id,
        customerName: customerName.trim(),
        instanceUrl: resolvedInstanceUrl,
        findings: scanResult.findings,
        healthScore: scanResult.healthScore,
        domainScores: scanResult.domainScores,
        scanMetadata: scanResult.scanMetadata,
      });
    } catch (dbError) {
      console.error('[export/upload] Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to persist scan results' },
        { status: 500 },
      );
    }
  } catch (err) {
    console.error('[export/upload] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
