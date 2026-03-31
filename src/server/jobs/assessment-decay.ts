import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Visibility levels for assessments based on age.
 *
 * - full:    0-30 days — complete detail, all findings visible
 * - reduced: 31-60 days — findings visible but marked as aging
 * - summary: 61-90 days — only aggregate scores visible, individual findings hidden
 * - expired: 90+ days — assessment archived, only health score retained
 */
export type VisibilityLevel = 'full' | 'reduced' | 'summary' | 'expired';

const FULL_DAYS = 30;
const REDUCED_DAYS = 60;
const SUMMARY_DAYS = 90;

/**
 * Manages time-decay visibility for assessments.
 *
 * Assessments progressively lose detail over time, encouraging customers
 * to run fresh assessments and ensuring stale data is not presented as
 * current.
 */
export class AssessmentDecayManager {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Process all assessments that need decay handling.
   *
   * - Queries completed assessments that are older than 90 days and not
   *   yet archived.
   * - Sets their status to 'archived' and stamps expires_at.
   *
   * @returns Count of assessments processed and how many were decayed.
   */
  async processDecay(): Promise<{ processed: number; decayed: number }> {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - SUMMARY_DAYS);

    // Find completed assessments older than 90 days that have not been archived
    const { data: candidates, error: fetchError } = await this.supabase
      .from('assessments')
      .select('id, created_at, expires_at, status')
      .eq('status', 'complete')
      .lt('created_at', ninetyDaysAgo.toISOString());

    if (fetchError) {
      throw new Error(`Failed to query assessments for decay: ${fetchError.message}`);
    }

    const toArchive = (candidates ?? []).filter((a) => {
      // Only archive if not already expired / archived
      if (a.status === 'archived') return false;
      // If expires_at is set and in the future, skip
      if (a.expires_at && new Date(a.expires_at) > new Date()) return false;
      return true;
    });

    let decayed = 0;

    for (const assessment of toArchive) {
      const { error: updateError } = await this.supabase
        .from('assessments')
        .update({
          status: 'archived',
          expires_at: new Date().toISOString(),
        })
        .eq('id', assessment.id);

      if (!updateError) {
        decayed++;
      }
    }

    return {
      processed: candidates?.length ?? 0,
      decayed,
    };
  }

  /**
   * Determine the visibility level for an assessment based on its age.
   */
  getVisibilityLevel(assessment: {
    created_at: string;
    expires_at?: string;
  }): VisibilityLevel {
    // If explicitly expired, return expired
    if (assessment.expires_at) {
      const expiresAt = new Date(assessment.expires_at);
      if (expiresAt <= new Date()) {
        return 'expired';
      }
    }

    const createdAt = new Date(assessment.created_at);
    const now = new Date();
    const ageDays = Math.floor(
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (ageDays <= FULL_DAYS) return 'full';
    if (ageDays <= REDUCED_DAYS) return 'reduced';
    if (ageDays <= SUMMARY_DAYS) return 'summary';
    return 'expired';
  }
}
