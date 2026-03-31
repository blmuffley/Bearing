import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import { BenchmarkAggregator } from '@/server/jobs/benchmark-aggregator';
import { CalibrationTracker } from '@/server/jobs/calibration-tracker';
import { ContinuousMonitor } from '@/server/jobs/continuous-monitor';

export const benchmarksRouter = router({
  /**
   * Get cohort benchmark data for a module.
   * Returns null if the cohort size is below the minimum threshold (10).
   */
  getCohortBenchmark: protectedProcedure
    .input(
      z.object({
        module: z.string(),
        industryVertical: z.string().optional(),
        companySizeTier: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const aggregator = new BenchmarkAggregator(ctx.supabase);
      return aggregator.getCohortBenchmarks({
        module: input.module,
        industryVertical: input.industryVertical,
        companySizeTier: input.companySizeTier,
      });
    }),

  /**
   * Get assessment trend data for a connection.
   * Returns health scores and finding counts over time.
   */
  getAssessmentTrend: protectedProcedure
    .input(
      z.object({
        connectionId: z.string().uuid(),
        limit: z.number().min(1).max(100).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const monitor = new ContinuousMonitor(ctx.supabase);
      return monitor.getAssessmentTrend(input.connectionId, input.limit);
    }),

  /**
   * Get all calibration factors for remediation patterns.
   * Shows how actual engagement hours compare to Bearing estimates.
   */
  getCalibrationFactors: protectedProcedure.query(async ({ ctx }) => {
    const tracker = new CalibrationTracker(ctx.supabase);
    return tracker.getCalibrationFactors();
  }),

  /**
   * Record actual hours for a completed remediation engagement.
   * Feeds the calibration feedback loop to improve future estimates.
   */
  recordActualHours: protectedProcedure
    .input(
      z.object({
        remediationPatternKey: z.string(),
        estimatedHoursLow: z.number().positive(),
        estimatedHoursHigh: z.number().positive(),
        actualHours: z.number().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tracker = new CalibrationTracker(ctx.supabase);
      await tracker.recordActualHours({
        remediationPatternKey: input.remediationPatternKey,
        estimatedHoursLow: input.estimatedHoursLow,
        estimatedHoursHigh: input.estimatedHoursHigh,
        actualHours: input.actualHours,
        orgId: ctx.orgId,
      });
      return { success: true };
    }),
});
