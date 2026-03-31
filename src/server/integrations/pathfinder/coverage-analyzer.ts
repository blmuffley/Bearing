export interface CoverageZone {
  zone: 'fully_covered' | 'pathfinder_only' | 'discovery_only' | 'dark';
  ciCount: number;
  cis: Array<{ sysId: string; name: string; className: string }>;
}

export interface CoverageAnalysis {
  zones: Record<string, CoverageZone>;
  totalCIs: number;
  fullyCoveredPercent: number;
  darkPercent: number;
  recommendations: string[];
}

/**
 * Perform four-zone coverage analysis by comparing CMDB CIs against
 * Pathfinder confidence data.
 *
 * Zones:
 * - fully_covered:    CI in CMDB AND has Pathfinder data with confidence > 50
 * - pathfinder_only:  Pathfinder sees traffic but no CMDB CI matches
 * - discovery_only:   CI in CMDB with discovery source but no Pathfinder data
 * - dark:             CI in CMDB with no discovery source AND no Pathfinder data
 */
export function analyzeCoverage(params: {
  cmdbCIs: Array<{
    sysId: string;
    name: string;
    className: string;
    discoverySource: string;
    lastDiscovered: string;
  }>;
  pathfinderCIs: Array<{
    ciSysId: string;
    trafficState: string;
    confidenceScore: number;
  }>;
}): CoverageAnalysis {
  const { cmdbCIs, pathfinderCIs } = params;

  // Index Pathfinder CIs by sys_id for quick lookup
  const pfIndex = new Map<
    string,
    { trafficState: string; confidenceScore: number }
  >();
  for (const pf of pathfinderCIs) {
    pfIndex.set(pf.ciSysId, pf);
  }

  // Track CMDB sys_ids for shadow IT detection
  const cmdbSysIds = new Set(cmdbCIs.map((ci) => ci.sysId));

  const fullyCovered: CoverageZone = {
    zone: 'fully_covered',
    ciCount: 0,
    cis: [],
  };
  const pathfinderOnly: CoverageZone = {
    zone: 'pathfinder_only',
    ciCount: 0,
    cis: [],
  };
  const discoveryOnly: CoverageZone = {
    zone: 'discovery_only',
    ciCount: 0,
    cis: [],
  };
  const dark: CoverageZone = { zone: 'dark', ciCount: 0, cis: [] };

  // Classify each CMDB CI
  for (const ci of cmdbCIs) {
    const pf = pfIndex.get(ci.sysId);
    const ciEntry = {
      sysId: ci.sysId,
      name: ci.name,
      className: ci.className,
    };

    if (pf && pf.confidenceScore > 50) {
      // CI in CMDB AND Pathfinder with confidence > 50
      fullyCovered.cis.push(ciEntry);
      fullyCovered.ciCount++;
    } else if (ci.discoverySource && ci.discoverySource.trim() !== '') {
      // CI in CMDB with discovery source but no qualifying Pathfinder data
      discoveryOnly.cis.push(ciEntry);
      discoveryOnly.ciCount++;
    } else {
      // CI in CMDB with no discovery source AND no Pathfinder data
      dark.cis.push(ciEntry);
      dark.ciCount++;
    }
  }

  // Identify Pathfinder-only CIs (not in CMDB)
  for (const pf of pathfinderCIs) {
    if (!cmdbSysIds.has(pf.ciSysId)) {
      pathfinderOnly.cis.push({
        sysId: pf.ciSysId,
        name: pf.ciSysId, // No CMDB record, so use sys_id as name
        className: 'unknown',
      });
      pathfinderOnly.ciCount++;
    }
  }

  // Compute totals
  const totalCIs =
    fullyCovered.ciCount +
    pathfinderOnly.ciCount +
    discoveryOnly.ciCount +
    dark.ciCount;

  const fullyCoveredPercent =
    totalCIs > 0 ? Math.round((fullyCovered.ciCount / totalCIs) * 100) : 0;
  const darkPercent =
    totalCIs > 0 ? Math.round((dark.ciCount / totalCIs) * 100) : 0;

  // Generate recommendations
  const recommendations: string[] = [];

  if (darkPercent > 20) {
    recommendations.push(
      'Consider expanding Pathfinder deployment to cover unmonitored infrastructure',
    );
  }

  if (pathfinderOnly.ciCount > 0) {
    recommendations.push(
      `Shadow IT detected \u2014 ${pathfinderOnly.ciCount} hosts have active traffic with no CMDB record`,
    );
  }

  const discoveryOnlyPercent =
    totalCIs > 0
      ? Math.round((discoveryOnly.ciCount / totalCIs) * 100)
      : 0;
  if (discoveryOnlyPercent > 30) {
    recommendations.push(
      `Pathfinder coverage gap \u2014 deploy agents to networks hosting these ${discoveryOnly.ciCount} CIs`,
    );
  }

  return {
    zones: {
      fully_covered: fullyCovered,
      pathfinder_only: pathfinderOnly,
      discovery_only: discoveryOnly,
      dark,
    },
    totalCIs,
    fullyCoveredPercent,
    darkPercent,
    recommendations,
  };
}
