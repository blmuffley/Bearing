import { z } from 'zod';
import { router, protectedProcedure } from '../init';

export const sowRouter = router({
  /** List all SOWs for the authenticated user's organization. */
  list: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('generated_sows')
      .select('*, assessments(id, health_score, status, instance_connections(customer_name))')
      .eq('org_id', ctx.orgId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }),

  /** Get a single SOW by ID with assessment details and included findings. */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: sow, error: sowError } = await ctx.supabase
        .from('generated_sows')
        .select('*, assessments(id, health_score, status, instance_connections(customer_name, instance_url))')
        .eq('id', input.id)
        .eq('org_id', ctx.orgId)
        .single();

      if (sowError) throw sowError;

      // Fetch the included findings
      const findingIds: string[] = (sow.included_finding_ids as string[]) ?? [];
      let findings: unknown[] = [];

      if (findingIds.length > 0) {
        const { data: findingsData, error: findingsError } = await ctx.supabase
          .from('findings')
          .select('*')
          .eq('org_id', ctx.orgId)
          .in('id', findingIds);

        if (findingsError) throw findingsError;
        findings = findingsData ?? [];
      }

      return { ...sow, findings };
    }),

  /** Update the status of a SOW. */
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(['draft', 'sent', 'under_review', 'accepted', 'declined']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('generated_sows')
        .update({ status: input.status })
        .eq('id', input.id)
        .eq('org_id', ctx.orgId)
        .select()
        .single();

      if (error) throw error;
      return data;
    }),

  /** Create a new SOW for an assessment. */
  create: protectedProcedure
    .input(
      z.object({
        assessmentId: z.string().uuid(),
        engagementType: z.enum(['time_and_materials', 'fixed_fee', 'blended']),
        totalHoursLow: z.number().int().nonnegative().optional(),
        totalHoursHigh: z.number().int().nonnegative().optional(),
        totalRevenueLow: z.number().nonnegative().optional(),
        totalRevenueHigh: z.number().nonnegative().optional(),
        includedFindingIds: z.array(z.string().uuid()),
        documentUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('generated_sows')
        .insert({
          org_id: ctx.orgId,
          assessment_id: input.assessmentId,
          engagement_type: input.engagementType,
          total_hours_low: input.totalHoursLow ?? null,
          total_hours_high: input.totalHoursHigh ?? null,
          total_revenue_low: input.totalRevenueLow ?? null,
          total_revenue_high: input.totalRevenueHigh ?? null,
          included_finding_ids: input.includedFindingIds,
          document_url: input.documentUrl ?? null,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }),
});
