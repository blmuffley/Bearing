import type { Severity } from '@/types/finding';

/** Minimal shape of a finding needed for health-score computation. */
interface HealthFinding {
  severity: Severity;
  affectedCount: number;
  module?: string;
}

const penaltyPerSeverity: Record<Exclude<Severity, 'info'>, number> = {
  critical: 5,
  high: 3,
  medium: 1.5,
  low: 0.5,
};

/**
 * Compute a health score (0-100) from an array of findings.
 *
 * Each finding contributes a penalty = penaltyPerSeverity * affectedCount.
 * Health = max(0, round(100 - min(totalPenalty, 100)))
 */
export function computeHealthScore(findings: HealthFinding[]): number {
  let totalPenalty = 0;

  for (const f of findings) {
    const weight = penaltyPerSeverity[f.severity as Exclude<Severity, 'info'>];
    if (weight != null) {
      totalPenalty += weight * f.affectedCount;
    }
  }

  return Math.max(0, Math.round(100 - Math.min(totalPenalty, 100)));
}

/**
 * Group findings by module and return per-domain health scores.
 *
 * @returns A record mapping module name to its health score (0-100).
 */
export function computeDomainScores(
  findings: HealthFinding[],
): Record<string, number> {
  const grouped: Record<string, HealthFinding[]> = {};

  for (const f of findings) {
    const domain = f.module ?? 'unknown';
    if (!grouped[domain]) {
      grouped[domain] = [];
    }
    grouped[domain].push(f);
  }

  const scores: Record<string, number> = {};
  for (const [domain, domainFindings] of Object.entries(grouped)) {
    scores[domain] = computeHealthScore(domainFindings);
  }

  return scores;
}
