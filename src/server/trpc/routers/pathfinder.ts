import { z } from 'zod';
import { router, protectedProcedure } from '../init';

const FUSION_CATEGORIES = [
  'cmdb_traffic_mismatch_active_idle',
  'cmdb_traffic_mismatch_retired_active',
  'cmdb_class_mismatch',
  'shadow_it_detection',
  'relationship_unconfirmed',
] as const;

export const pathfinderRouter = router({
  /**
   * Get all Pathfinder confidence records for a given instance connection,
   * scoped to the authenticated user's organization.
   */
  getConfidenceData: protectedProcedure
    .input(
      z.object({
        instanceConnectionId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('pathfinder_confidence')
        .select('*')
        .eq('instance_connection_id', input.instanceConnectionId)
        .eq('org_id', ctx.orgId)
        .order('confidence_score', { ascending: false });

      if (error) throw error;
      return data;
    }),

  /**
   * Get aggregated coverage summary stats for a given instance connection:
   * counts by traffic_state, total records, and average confidence.
   */
  getCoverageSummary: protectedProcedure
    .input(
      z.object({
        instanceConnectionId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { data: records, error } = await ctx.supabase
        .from('pathfinder_confidence')
        .select('traffic_state, confidence_score')
        .eq('instance_connection_id', input.instanceConnectionId)
        .eq('org_id', ctx.orgId);

      if (error) throw error;

      const byTrafficState: Record<string, number> = {};
      let totalConfidence = 0;

      for (const record of records ?? []) {
        byTrafficState[record.traffic_state] =
          (byTrafficState[record.traffic_state] ?? 0) + 1;
        totalConfidence += record.confidence_score;
      }

      const totalRecords = records?.length ?? 0;
      const averageConfidence =
        totalRecords > 0
          ? Math.round(totalConfidence / totalRecords)
          : 0;

      return {
        byTrafficState,
        totalRecords,
        averageConfidence,
      };
    }),

  /**
   * Get fusion findings for an assessment. Returns findings whose category
   * matches one of the Pathfinder fusion rule keys.
   */
  getFusionFindings: protectedProcedure
    .input(
      z.object({
        assessmentId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('findings')
        .select('*')
        .eq('assessment_id', input.assessmentId)
        .eq('org_id', ctx.orgId)
        .in('category', [...FUSION_CATEGORIES])
        .order('composite_score', { ascending: false });

      if (error) throw error;
      return data;
    }),
});
