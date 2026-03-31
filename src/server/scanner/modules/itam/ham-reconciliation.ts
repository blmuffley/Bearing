/**
 * ITAM hardware asset management reconciliation scan rules.
 *
 * These functions evaluate ServiceNow hardware asset data for asset
 * management gaps and return arrays of findings (without composite scores -
 * the scan engine adds those).
 */

import type { Finding } from '@/types/finding';

// ---------------------------------------------------------------------------
// Minimal record shape expected from the export payload
// ---------------------------------------------------------------------------

interface HardwareAsset {
  sys_id: string;
  display_name: string;
  model: string;
  serial_number: string;
  ci?: string;
  install_status: string;
  warranty_expiration?: string;
  assigned_to?: string;
}

// ---------------------------------------------------------------------------
// Rule: Unreconciled assets (no CI link)
// ---------------------------------------------------------------------------

/**
 * Find hardware assets where the ci field is empty (no CMDB CI linked).
 * Unreconciled assets create a gap between the asset register and the
 * CMDB, leading to inaccurate impact analysis and incomplete service maps.
 *
 * Each batch of unreconciled assets produces a **high** finding.
 */
export function evaluateUnreconciledAssets(
  assets: HardwareAsset[],
): Omit<Finding, 'compositeScore'>[] {
  const findings: Omit<Finding, 'compositeScore'>[] = [];

  const unreconciled = assets.filter(
    (a) => !a.ci || a.ci.trim() === '',
  );

  if (unreconciled.length === 0) return [];

  findings.push({
    ruleKey: 'itam_unreconciled_assets',
    title: `${unreconciled.length} hardware asset(s) without a linked CI`,
    description:
      `${unreconciled.length} hardware asset(s) have an empty ci field, meaning ` +
      `they are not linked to a CMDB configuration item. Unreconciled assets ` +
      `create a gap between the asset register and the CMDB, leading to ` +
      `inaccurate impact analysis, incomplete service maps, and duplicated ` +
      `records across systems.`,
    severity: 'high',
    severityScore: 3,
    effortTshirt: 'L',
    effortHoursLow: 8,
    effortHoursHigh: 32,
    riskScore: 3,
    evidence: {
      table: 'alm_hardware',
      field: 'ci',
      value: `${unreconciled.length} assets with empty ci field (e.g. ${unreconciled.slice(0, 3).map((a) => a.display_name).join(', ')})`,
    },
    remediationPattern: 'asset_ci_reconciliation',
    remediationDescription:
      'Run the HAM-CMDB reconciliation process to match hardware assets to ' +
      'their corresponding CIs. Configure identification rules based on serial ' +
      'number and model. Establish ongoing reconciliation schedules to prevent ' +
      'future drift between HAM and CMDB.',
    affectedCount: unreconciled.length,
    pathfinderRelevant: true,
    pathfinderRecommendation: {
      action: 'asset_discovery',
      reason: 'Pathfinder can identify active hardware via network observation to aid CI reconciliation.',
    },
  });

  return findings;
}

// ---------------------------------------------------------------------------
// Rule: Expired warranty assets still in use
// ---------------------------------------------------------------------------

/**
 * Find assets where warranty_expiration is in the past and install_status
 * is "In use". Expired-warranty assets in production increase financial
 * and operational risk due to lack of vendor support.
 *
 * Each batch of expired-warranty assets produces a **medium** finding.
 */
export function evaluateExpiredWarrantyAssets(
  assets: HardwareAsset[],
): Omit<Finding, 'compositeScore'>[] {
  const findings: Omit<Finding, 'compositeScore'>[] = [];
  const now = new Date();

  const expired = assets.filter((a) => {
    if (a.install_status !== 'In use' && a.install_status !== '1') return false;
    if (!a.warranty_expiration || a.warranty_expiration.trim() === '')
      return false;
    const expDate = new Date(a.warranty_expiration);
    if (isNaN(expDate.getTime())) return false;
    return expDate < now;
  });

  if (expired.length === 0) return [];

  findings.push({
    ruleKey: 'itam_expired_warranty_assets',
    title: `${expired.length} in-use asset(s) with expired warranty`,
    description:
      `${expired.length} hardware asset(s) have an expired warranty but are ` +
      `still marked as "In use". Expired-warranty assets in production increase ` +
      `financial and operational risk due to lack of vendor support for hardware ` +
      `failures, potentially leading to extended outages and unbudgeted ` +
      `replacement costs.`,
    severity: 'medium',
    severityScore: 2,
    effortTshirt: 'M',
    effortHoursLow: 2,
    effortHoursHigh: 8,
    riskScore: 2,
    evidence: {
      table: 'alm_hardware',
      field: 'warranty_expiration',
      value: `${expired.length} in-use assets with expired warranty (e.g. ${expired.slice(0, 3).map((a) => a.display_name).join(', ')})`,
    },
    remediationPattern: 'asset_lifecycle_planning',
    remediationDescription:
      'Review expired-warranty assets and develop a lifecycle replacement plan. ' +
      'Negotiate warranty extensions or support contracts where applicable. ' +
      'Implement warranty expiration alerts and proactive refresh cycles.',
    affectedCount: expired.length,
    pathfinderRelevant: false,
    pathfinderRecommendation: null,
  });

  return findings;
}
