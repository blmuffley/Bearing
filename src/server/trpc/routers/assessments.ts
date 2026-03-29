import { z } from 'zod';
import { router, protectedProcedure } from '../init';

export const assessmentsRouter = router({
  /** List all assessments for the authenticated user's organization. */
  list: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('assessments')
      .select('*, instance_connections(customer_name, instance_url)')
      .eq('org_id', ctx.orgId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }),

  /** Get a single assessment by ID, including a count of its findings. */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: assessment, error } = await ctx.supabase
        .from('assessments')
        .select('*, instance_connections(customer_name, instance_url)')
        .eq('id', input.id)
        .eq('org_id', ctx.orgId)
        .single();

      if (error) throw error;

      // Get findings count
      const { count } = await ctx.supabase
        .from('findings')
        .select('*', { count: 'exact', head: true })
        .eq('assessment_id', input.id)
        .eq('org_id', ctx.orgId);

      return { ...assessment, findings_count: count ?? 0 };
    }),

  /** Create a new assessment. */
  create: protectedProcedure
    .input(
      z.object({
        instance_connection_id: z.string().uuid(),
        scan_type: z.enum(['full_api', 'export_ingest', 'instance_scan_import']),
        modules_enabled: z.array(z.string()).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('assessments')
        .insert({
          org_id: ctx.orgId,
          instance_connection_id: input.instance_connection_id,
          scan_type: input.scan_type,
          modules_enabled: input.modules_enabled,
          status: 'queued',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }),
});
