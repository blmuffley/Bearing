import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Calibration factor for a single remediation pattern.
 */
export interface CalibrationFactor {
  patternKey: string;
  /** Multiplier applied to base hour estimates (1.0 = perfectly calibrated). */
  factor: number;
  /** Number of actual-vs-estimated samples collected. */
  sampleSize: number;
  /** Average accuracy ratio (actual / estimated midpoint). */
  avgAccuracy: number;
}

/** Minimum samples required before applying calibration adjustments. */
const MIN_SAMPLE_SIZE = 3;

/**
 * Tracks actual engagement hours against Bearing estimates for the
 * calibration feedback loop. As more engagements complete, the system
 * self-corrects its estimates based on real-world data.
 *
 * This is a core part of the patent-protected calibration feedback loop.
 */
export class CalibrationTracker {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Record actual hours for a completed remediation engagement.
   *
   * Compares actual hours to the estimated midpoint and updates the
   * calibration factor on the corresponding remediation_patterns row.
   */
  async recordActualHours(params: {
    remediationPatternKey: string;
    estimatedHoursLow: number;
    estimatedHoursHigh: number;
    actualHours: number;
    orgId: string;
  }): Promise<void> {
    const { remediationPatternKey, estimatedHoursLow, estimatedHoursHigh, actualHours } =
      params;

    // Fetch current calibration state for this pattern
    const { data: pattern, error: fetchError } = await this.supabase
      .from('remediation_patterns')
      .select('calibration_factor, calibration_sample_size')
      .eq('pattern_key', remediationPatternKey)
      .single();

    if (fetchError || !pattern) {
      throw new Error(
        `Remediation pattern not found: ${remediationPatternKey} — ${fetchError?.message ?? 'no data'}`,
      );
    }

    const currentFactor = (pattern.calibration_factor as number) ?? 1.0;
    const currentSampleSize = (pattern.calibration_sample_size as number) ?? 0;

    // Compute the estimated midpoint for this sample
    const estimatedMidpoint = (estimatedHoursLow + estimatedHoursHigh) / 2;
    if (estimatedMidpoint <= 0) {
      throw new Error('Estimated hours midpoint must be greater than zero.');
    }

    // Compute the accuracy ratio for this sample
    const sampleRatio = actualHours / estimatedMidpoint;

    // Update the running average: new_factor = (old_factor * old_n + sample_ratio) / (old_n + 1)
    const newSampleSize = currentSampleSize + 1;
    const newFactor =
      (currentFactor * currentSampleSize + sampleRatio) / newSampleSize;

    // Round to 3 decimal places for readability
    const roundedFactor = Math.round(newFactor * 1000) / 1000;

    const { error: updateError } = await this.supabase
      .from('remediation_patterns')
      .update({
        calibration_factor: roundedFactor,
        calibration_sample_size: newSampleSize,
      })
      .eq('pattern_key', remediationPatternKey);

    if (updateError) {
      throw new Error(
        `Failed to update calibration for ${remediationPatternKey}: ${updateError.message}`,
      );
    }
  }

  /**
   * Retrieve calibration factors for all remediation patterns that have
   * at least one data sample.
   */
  async getCalibrationFactors(): Promise<Record<string, CalibrationFactor>> {
    const { data, error } = await this.supabase
      .from('remediation_patterns')
      .select('pattern_key, calibration_factor, calibration_sample_size')
      .gt('calibration_sample_size', 0);

    if (error) {
      throw new Error(`Failed to fetch calibration factors: ${error.message}`);
    }

    const result: Record<string, CalibrationFactor> = {};

    for (const row of data ?? []) {
      const patternKey = row.pattern_key as string;
      const factor = (row.calibration_factor as number) ?? 1.0;
      const sampleSize = (row.calibration_sample_size as number) ?? 0;

      result[patternKey] = {
        patternKey,
        factor,
        sampleSize,
        avgAccuracy: factor, // factor IS the running average of actual/estimated
      };
    }

    return result;
  }

  /**
   * Apply calibration adjustment to base hour estimates.
   *
   * If the pattern has fewer than MIN_SAMPLE_SIZE data points, the base
   * estimates are returned unchanged (factor = 1.0).
   */
  async applyCalibration(
    patternKey: string,
    baseHoursLow: number,
    baseHoursHigh: number,
  ): Promise<{ adjustedLow: number; adjustedHigh: number }> {
    const { data: pattern, error } = await this.supabase
      .from('remediation_patterns')
      .select('calibration_factor, calibration_sample_size')
      .eq('pattern_key', patternKey)
      .single();

    if (error || !pattern) {
      // If pattern not found, return unadjusted estimates
      return { adjustedLow: baseHoursLow, adjustedHigh: baseHoursHigh };
    }

    const sampleSize = (pattern.calibration_sample_size as number) ?? 0;
    const factor = (pattern.calibration_factor as number) ?? 1.0;

    // Don't apply calibration until we have enough data
    if (sampleSize < MIN_SAMPLE_SIZE) {
      return { adjustedLow: baseHoursLow, adjustedHigh: baseHoursHigh };
    }

    return {
      adjustedLow: Math.round(baseHoursLow * factor * 10) / 10,
      adjustedHigh: Math.round(baseHoursHigh * factor * 10) / 10,
    };
  }
}
