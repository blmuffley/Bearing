import type { Severity, EffortTshirt } from '@/types/finding';

const severityMap: Record<Exclude<Severity, 'info'>, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const effortInverseMap: Record<EffortTshirt, number> = {
  XS: 5,
  S: 4,
  M: 3,
  L: 2,
  XL: 1,
};

/**
 * Compute a composite score using weighted severity, inverse effort, and risk.
 *
 * Formula: composite = (severity * 0.4) + (effortInverse * 0.3) + (risk * 0.3)
 *
 * @param severity  - Finding severity level (critical | high | medium | low)
 * @param effortTshirt - T-shirt size for remediation effort
 * @param riskScore - Numeric risk score from 1 to 5
 * @returns The composite score as a number
 */
export function computeCompositeScore(
  severity: Exclude<Severity, 'info'>,
  effortTshirt: EffortTshirt,
  riskScore: number,
): number {
  const sevValue = severityMap[severity];
  const effortValue = effortInverseMap[effortTshirt];
  const composite = sevValue * 0.4 + effortValue * 0.3 + riskScore * 0.3;
  return Math.round(composite * 100) / 100;
}
