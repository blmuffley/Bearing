import { z } from 'zod';
import { router, protectedProcedure } from '../init';

export const findingsRouter = router({
  /** List findings for a given assessment, sorted by composite_score descending. */
  listByAssessment: protectedProcedure
    .input(
      z.object({
        assessmentId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('findings')
        .select('*')
        .eq('assessment_id', input.assessmentId)
        .eq('org_id', ctx.orgId)
        .order('composite_score', { ascending: false });

      if (error) throw error;
      return data;
    }),

  /** Get aggregated stats for an assessment's findings: counts by severity and module. */
  getStats: protectedProcedure
    .input(
      z.object({
        assessmentId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { data: findings, error } = await ctx.supabase
        .from('findings')
        .select('severity, module')
        .eq('assessment_id', input.assessmentId)
        .eq('org_id', ctx.orgId);

      if (error) throw error;

      const bySeverity: Record<string, number> = {};
      const byModule: Record<string, number> = {};

      for (const f of findings ?? []) {
        bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;
        byModule[f.module] = (byModule[f.module] ?? 0) + 1;
      }

      return { bySeverity, byModule, total: findings?.length ?? 0 };
    }),
});
