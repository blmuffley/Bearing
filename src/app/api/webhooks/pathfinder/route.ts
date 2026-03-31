import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { ConfidenceIngester } from '@/server/integrations/pathfinder/confidence-ingester';

// ---------------------------------------------------------------------------
// Zod schema matching the PathfinderConfidenceFeed type
// ---------------------------------------------------------------------------

const CommunicationPartnerSchema = z.object({
  partner_ci_sys_id: z.string(),
  protocol: z.string(),
  port: z.number(),
  last_seen: z.string(),
  traffic_volume_bytes_24h: z.number(),
});

const RelationshipConfirmationSchema = z.object({
  rel_ci_sys_id: z.string(),
  parent_ci_sys_id: z.string(),
  child_ci_sys_id: z.string(),
  rel_type: z.string(),
  confirmed: z.boolean(),
  confidence: z.number(),
});

const BehavioralClassificationSchema = z.object({
  suggested_class: z.string(),
  classification_confidence: z.number(),
  reasoning: z.string(),
});

const CIConfidenceRecordSchema = z.object({
  ci_sys_id: z.string(),
  ci_class: z.string(),
  confidence_score: z.number().min(0).max(100),
  traffic_state: z.enum(['active', 'idle', 'deprecated', 'unknown']),
  last_observation: z.string(),
  observation_count: z.number(),
  communication_partners: z.array(CommunicationPartnerSchema),
  relationship_confirmations: z.array(RelationshipConfirmationSchema),
  behavioral_classification: BehavioralClassificationSchema.optional(),
});

const CoverageSummarySchema = z.object({
  total_monitored_hosts: z.number(),
  active_cis: z.number(),
  idle_cis: z.number(),
  deprecated_cis: z.number(),
  unknown_cis: z.number(),
  monitored_subnets: z.array(z.string()),
  unmonitored_subnets_detected: z.array(z.string()),
});

const PathfinderConfidenceFeedSchema = z.object({
  schema_version: z.string(),
  pathfinder_instance_id: z.string(),
  servicenow_instance_url: z.string(),
  observation_window_hours: z.number(),
  generated_at: z.string(),
  ci_confidence_records: z.array(CIConfidenceRecordSchema),
  coverage_summary: CoverageSummarySchema,
});

// ---------------------------------------------------------------------------
// POST /api/webhooks/pathfinder
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate via API key
    const apiKey = request.headers.get('X-Bearing-API-Key');

    if (!apiKey || apiKey !== process.env.PATHFINDER_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    // 2. Parse and validate the payload
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 },
      );
    }

    const parseResult = PathfinderConfidenceFeedSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid payload',
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const feed = parseResult.data;

    // 3. Look up the instance connection by servicenow_instance_url
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: connection, error: connError } = await serviceClient
      .from('instance_connections')
      .select('id, org_id')
      .eq('instance_url', feed.servicenow_instance_url)
      .eq('status', 'active')
      .limit(1)
      .single();

    if (connError || !connection) {
      return NextResponse.json(
        {
          error: `No active instance connection found for ${feed.servicenow_instance_url}`,
        },
        { status: 404 },
      );
    }

    // 4. Ingest the confidence records
    const ingester = new ConfidenceIngester(serviceClient);
    const result = await ingester.ingestFeed(
      feed.ci_confidence_records,
      connection.org_id,
      connection.id,
    );

    // 5. Return success
    return NextResponse.json({
      received: feed.ci_confidence_records.length,
      upserted: result.upserted,
    });
  } catch (err) {
    console.error('[webhooks/pathfinder] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
