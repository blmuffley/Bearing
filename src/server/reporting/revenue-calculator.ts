import type { Severity, EffortTshirt } from '@/types/finding';
import type { RateCard, RevenueProjection } from '@/types/sow';
import { computeCompositeScore } from '@/server/scoring/composite-scorer';

/** Minimal finding shape required for revenue calculations. */
interface RevenueFinding {
  id: string;
  title: string;
  severity: Severity;
  effortTshirt: EffortTshirt;
  effortHoursLow: number;
  effortHoursHigh: number;
  affectedCount: number;
  riskScore: number;
  module?: string;
  compositeScore?: number;
}

/** Per-module revenue breakdown. */
interface ModuleRevenue {
  hoursLow: number;
  hoursHigh: number;
  revenueLow: number;
  revenueHigh: number;
}

/** A quick-win finding with its composite score. */
interface QuickWin {
  id: string;
  title: string;
  severity: Severity;
  effortTshirt: EffortTshirt;
  compositeScore: number;
  hoursLow: number;
  hoursHigh: number;
  revenueLow: number;
  revenueHigh: number;
}

/** Fallback type definitions in case @/types/sow is not yet created. */
type RateCardInput = RateCard & {
  blendedRate?: number;
  roles?: Array<{ hourlyRate: number }>;
};

/**
 * Derive blended rate from a rate card.
 * Uses blendedRate if provided, otherwise averages all role hourly rates.
 */
function deriveBlendedRate(rateCard: RateCardInput): number {
  if (rateCard.blendedRate != null && rateCard.blendedRate > 0) {
    return rateCard.blendedRate;
  }

  const roles = rateCard.roles ?? [];
  if (roles.length === 0) {
    return 0;
  }

  const sum = roles.reduce((acc, r) => acc + r.hourlyRate, 0);
  return sum / roles.length;
}

const HIGH_SEVERITY_SET: Set<string> = new Set(['critical', 'high']);
const QUICK_WIN_EFFORT: Set<string> = new Set(['XS', 'S']);

/**
 * Calculate revenue projections from findings and a rate card.
 *
 * @param findings - Array of assessment findings
 * @param rateCard - Rate card containing blendedRate or per-role hourly rates
 * @returns RevenueProjection with totals, per-module breakdown, and quick wins
 */
export function calculateRevenue(
  findings: RevenueFinding[],
  rateCard: RateCardInput,
): RevenueProjection {
  const blendedRate = deriveBlendedRate(rateCard);

  let totalHoursLow = 0;
  let totalHoursHigh = 0;

  const byModule: Record<string, ModuleRevenue> = {};
  const quickWins: QuickWin[] = [];

  for (const f of findings) {
    const hoursLow = f.effortHoursLow * f.affectedCount;
    const hoursHigh = f.effortHoursHigh * f.affectedCount;

    totalHoursLow += hoursLow;
    totalHoursHigh += hoursHigh;

    // Per-module aggregation
    const mod = f.module ?? 'unknown';
    if (!byModule[mod]) {
      byModule[mod] = { hoursLow: 0, hoursHigh: 0, revenueLow: 0, revenueHigh: 0 };
    }
    byModule[mod].hoursLow += hoursLow;
    byModule[mod].hoursHigh += hoursHigh;
    byModule[mod].revenueLow += hoursLow * blendedRate;
    byModule[mod].revenueHigh += hoursHigh * blendedRate;

    // Quick-win detection: severity >= high AND effort in [XS, S]
    if (HIGH_SEVERITY_SET.has(f.severity) && QUICK_WIN_EFFORT.has(f.effortTshirt)) {
      const composite =
        f.compositeScore ??
        computeCompositeScore(
          f.severity as Exclude<Severity, 'info'>,
          f.effortTshirt,
          f.riskScore,
        );

      quickWins.push({
        id: f.id,
        title: f.title,
        severity: f.severity,
        effortTshirt: f.effortTshirt,
        compositeScore: composite,
        hoursLow,
        hoursHigh,
        revenueLow: hoursLow * blendedRate,
        revenueHigh: hoursHigh * blendedRate,
      });
    }
  }

  // Sort quick wins by composite score descending
  quickWins.sort((a, b) => b.compositeScore - a.compositeScore);

  return {
    blendedRate,
    totalHoursLow,
    totalHoursHigh,
    totalRevenueLow: totalHoursLow * blendedRate,
    totalRevenueHigh: totalHoursHigh * blendedRate,
    byModule,
    quickWins,
  } as RevenueProjection;
}
