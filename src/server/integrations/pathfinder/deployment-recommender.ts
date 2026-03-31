export interface DeploymentRecommendation {
  targetNetwork: string;
  targetSubnets: string[];
  ciCount: number;
  rationale: string;
  priority: 'high' | 'medium' | 'low';
  estimatedCoverage: number;
}

/**
 * Extract /24 subnet from an IPv4 address.
 * Returns null for non-IPv4 or missing addresses.
 */
function extractSubnet(ip: string | undefined): string | null {
  if (!ip) return null;
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  // Validate each octet
  for (const part of parts) {
    const num = Number(part);
    if (isNaN(num) || num < 0 || num > 255) return null;
  }
  return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
}

/**
 * Generate Pathfinder deployment manifest recommendations based on
 * dark-zone and discovery-only CIs.
 *
 * Groups CIs by subnet (extracted from IP) or location. Prioritises by
 * count. Skips subnets already covered by existing Pathfinder agents.
 */
export function generateDeploymentRecommendations(params: {
  darkZoneCIs: Array<{
    sysId: string;
    name: string;
    className: string;
    ipAddress?: string;
    location?: string;
  }>;
  discoveryOnlyCIs: Array<{
    sysId: string;
    name: string;
    className: string;
    ipAddress?: string;
    lastDiscovered: string;
  }>;
  existingPathfinderSubnets: string[];
}): DeploymentRecommendation[] {
  const { darkZoneCIs, discoveryOnlyCIs, existingPathfinderSubnets } = params;
  const coveredSubnets = new Set(existingPathfinderSubnets);

  // Merge all CIs that need coverage
  const allCIs = [
    ...darkZoneCIs.map((ci) => ({ ...ci, source: 'dark' as const })),
    ...discoveryOnlyCIs.map((ci) => ({
      ...ci,
      source: 'discovery_only' as const,
    })),
  ];

  // Group CIs by subnet or location
  const subnetGroups = new Map<
    string,
    { cis: typeof allCIs; isSubnet: boolean }
  >();

  for (const ci of allCIs) {
    const subnet = extractSubnet(ci.ipAddress);
    const groupKey = subnet ?? ('location' in ci ? ci.location : undefined) ?? 'unknown';
    const isSubnet = subnet !== null;

    if (!subnetGroups.has(groupKey)) {
      subnetGroups.set(groupKey, { cis: [], isSubnet });
    }
    subnetGroups.get(groupKey)!.cis.push(ci);
  }

  const recommendations: DeploymentRecommendation[] = [];

  for (const [groupKey, group] of subnetGroups) {
    // Skip subnets already covered by existing Pathfinder agents
    if (group.isSubnet && coveredSubnets.has(groupKey)) {
      continue;
    }

    // Skip the catch-all unknown group if it has no CIs
    if (groupKey === 'unknown' && group.cis.length === 0) {
      continue;
    }

    const darkCount = group.cis.filter((c) => c.source === 'dark').length;
    const discoveryOnlyCount = group.cis.filter(
      (c) => c.source === 'discovery_only',
    ).length;

    // Priority based on count
    let priority: 'high' | 'medium' | 'low';
    if (group.cis.length >= 20) {
      priority = 'high';
    } else if (group.cis.length >= 5) {
      priority = 'medium';
    } else {
      priority = 'low';
    }

    // Build rationale
    const parts: string[] = [];
    if (darkCount > 0) {
      parts.push(`${darkCount} dark CI(s) with no monitoring`);
    }
    if (discoveryOnlyCount > 0) {
      parts.push(
        `${discoveryOnlyCount} CI(s) with discovery-only coverage`,
      );
    }
    const rationale = `Deploy Pathfinder agent to cover ${parts.join(' and ')}`;

    // Estimated coverage: percentage of total unmonitored CIs this
    // recommendation would cover
    const estimatedCoverage =
      allCIs.length > 0
        ? Math.round((group.cis.length / allCIs.length) * 100)
        : 0;

    recommendations.push({
      targetNetwork: groupKey,
      targetSubnets: group.isSubnet ? [groupKey] : [],
      ciCount: group.cis.length,
      rationale,
      priority,
      estimatedCoverage,
    });
  }

  // Sort by CI count descending (highest-impact first)
  recommendations.sort((a, b) => b.ciCount - a.ciCount);

  return recommendations;
}
