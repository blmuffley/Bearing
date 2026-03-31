import type { SupabaseClient } from '@supabase/supabase-js';

export interface ConfidenceFeedRecord {
  ci_sys_id: string;
  ci_class: string;
  confidence_score: number;
  traffic_state: 'active' | 'idle' | 'deprecated' | 'unknown';
  last_observation: string;
  observation_count: number;
  behavioral_classification?: {
    suggested_class: string;
    classification_confidence: number;
    reasoning: string;
  } | null;
  relationship_confirmations: Array<{
    rel_ci_sys_id: string;
    parent_ci_sys_id: string;
    child_ci_sys_id: string;
    rel_type: string;
    confirmed: boolean;
    confidence: number;
  }>;
}

/**
 * Processes and stores Pathfinder confidence feed data into the
 * pathfinder_confidence table.
 */
export class ConfidenceIngester {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Ingest an array of Pathfinder confidence feed records.
   *
   * Each CI confidence record is upserted using the unique constraint
   * on (org_id, instance_connection_id, ci_sys_id). Records are batched
   * in chunks of 100.
   *
   * @returns Count of upserted and errored records.
   */
  async ingestFeed(
    records: ConfidenceFeedRecord[],
    orgId: string,
    connectionId: string,
  ): Promise<{ upserted: number; errors: number }> {
    const rows = records.map((record) =>
      this.mapRecordToRow(record, orgId, connectionId),
    );

    if (rows.length === 0) {
      return { upserted: 0, errors: 0 };
    }

    const BATCH_SIZE = 100;
    let upserted = 0;
    let errors = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);

      const { error, count } = await this.supabase
        .from('pathfinder_confidence')
        .upsert(batch, {
          onConflict: 'org_id,instance_connection_id,ci_sys_id',
          count: 'exact',
        });

      if (error) {
        console.error(
          '[ConfidenceIngester] Batch upsert error:',
          error.message,
        );
        errors += batch.length;
      } else {
        upserted += count ?? batch.length;
      }
    }

    return { upserted, errors };
  }

  /**
   * Map a Pathfinder confidence record to the database row shape.
   */
  private mapRecordToRow(
    record: ConfidenceFeedRecord,
    orgId: string,
    connectionId: string,
  ) {
    return {
      org_id: orgId,
      instance_connection_id: connectionId,
      ci_sys_id: record.ci_sys_id,
      ci_class: record.ci_class,
      confidence_score: record.confidence_score,
      traffic_state: record.traffic_state,
      last_observation: record.last_observation,
      observation_count: record.observation_count,
      behavioral_classification: record.behavioral_classification ?? null,
      relationship_confirmations: record.relationship_confirmations ?? [],
      received_at: new Date().toISOString(),
    };
  }
}
