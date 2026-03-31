import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// TODO: Import encrypt from '@/lib/encryption' once the module is implemented.
// For now, credentials are stored as-is. This MUST be addressed before production.
function encryptPlaceholder(data: unknown): string {
  // Placeholder — replace with real encryption using ENCRYPTION_KEY env var
  return JSON.stringify(data);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerName,
      instanceUrl,
      connectionType,
      credentials,
      servicenowVersion,
    } = body;

    if (!customerName || !connectionType) {
      return NextResponse.json(
        { error: 'customerName and connectionType are required' },
        { status: 400 },
      );
    }

    const supabase = await createServerSupabaseClient();

    // Encrypt credentials before storing
    const credentialsEncrypted =
      credentials && connectionType !== 'export'
        ? encryptPlaceholder(credentials)
        : null;

    const { data, error } = await supabase
      .from('instance_connections')
      .insert({
        customer_name: customerName,
        instance_url: instanceUrl ?? '',
        connection_type: connectionType,
        credentials_encrypted: credentialsEncrypted,
        servicenow_version: servicenowVersion ?? null,
        status: connectionType === 'export' ? 'active' : 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to save connection:', error);
      return NextResponse.json(
        { error: 'Failed to save connection' },
        { status: 500 },
      );
    }

    return NextResponse.json({ connection: data }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unknown error saving connection';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
