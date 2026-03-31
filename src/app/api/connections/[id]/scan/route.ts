import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// TODO: Import these once the modules are implemented:
// import { decrypt } from '@/lib/encryption';
// import { LiveScanner } from '@/server/scanner/live-scanner';

// Placeholder decrypt — replace with real decryption
function decryptPlaceholder(encrypted: string): Record<string, unknown> {
  try {
    return JSON.parse(encrypted);
  } catch {
    return {};
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // TODO: Move this to a background job queue (Inngest/BullMQ) for production.
  // Synchronous scans will time out on large instances. The flow should be:
  // 1. POST creates a queued job and returns immediately with a job ID
  // 2. The job runs in the background (LiveScanner → findings → scoring)
  // 3. Client polls or uses SSE/websocket for progress updates
  // 4. On completion, the assessment ID is available via the job status

  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    // Fetch the connection
    const { data: connection, error: connError } = await supabase
      .from('instance_connections')
      .select('*')
      .eq('id', id)
      .single();

    if (connError || !connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 },
      );
    }

    if (connection.connection_type === 'export') {
      return NextResponse.json(
        { error: 'Export-only connections cannot run live scans. Upload an export file instead.' },
        { status: 400 },
      );
    }

    // Decrypt credentials
    const _credentials = connection.credentials_encrypted
      ? decryptPlaceholder(
          typeof connection.credentials_encrypted === 'string'
            ? connection.credentials_encrypted
            : JSON.stringify(connection.credentials_encrypted),
        )
      : null;

    if (!_credentials) {
      return NextResponse.json(
        { error: 'No credentials found for this connection' },
        { status: 400 },
      );
    }

    // TODO: Create LiveScanner instance and run the scan:
    //
    // const scanner = new LiveScanner({
    //   instanceUrl: connection.instance_url,
    //   auth: connection.connection_type === 'basic'
    //     ? { type: 'basic', username: credentials.username, password: credentials.password }
    //     : { type: 'oauth', accessToken: credentials.accessToken },
    // });
    //
    // const scanResult = await scanner.run();

    // Create assessment record
    const { data: assessment, error: assessmentError } = await supabase
      .from('assessments')
      .insert({
        instance_connection_id: id,
        scan_type: 'full_api',
        status: 'queued',
        modules_enabled: ['core', 'cmdb', 'itsm'],
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (assessmentError || !assessment) {
      console.error('Failed to create assessment:', assessmentError);
      return NextResponse.json(
        { error: 'Failed to create assessment' },
        { status: 500 },
      );
    }

    // Update connection last_connected_at
    await supabase
      .from('instance_connections')
      .update({
        last_connected_at: new Date().toISOString(),
        status: 'active',
      })
      .eq('id', id);

    // TODO: Once LiveScanner is implemented:
    // 1. Run the scan and collect findings
    // 2. Insert findings into the findings table
    // 3. Compute health/domain scores
    // 4. Update the assessment record with scores and status='complete'
    //
    // For now, return the assessment in 'queued' status.

    return NextResponse.json({
      assessmentId: assessment.id,
      status: 'queued',
      message: 'Live scan has been queued. LiveScanner is not yet implemented — check back after Phase 3 completion.',
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unknown error triggering scan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
