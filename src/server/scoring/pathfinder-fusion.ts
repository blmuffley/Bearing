import type { Finding } from '@/types/finding';
import { computeCompositeScore } from './composite-scorer';
import { computeHealthScore } from './health-index';

export interface FusionCIData {
  ciSysId: string;
  ciClass: string;
  confidenceScore: number;
  trafficState: string;
  behavioralClassification?: {
    suggestedClass: string;
    classificationConfidence: number;
    reasoning: string;
  } | null;
  relationshipConfirmations: Array<{ confirmed: boolean; confidence: number }>;
}

export interface CmdbCI {
  sysId: string;
  name: string;
  className: string;
  operationalStatus: string;
}

export interface FusionInput {
  findings: Array<{
    id: string;
    module: string;
    category: string;
    severity: string;
    compositeScore: number;
    evidence: { table: string; sysId?: string };
  }>;
  pathfinderData: FusionCIData[];
  cmdbCIs?: CmdbCI[];
}

export interface EnhancedFinding extends Omit<Finding, 'compositeScore'> {
  compositeScore: number;
  pathfinderConfidence?: number;
  pathfinderState?: string;
}

export interface FusionResult {
  enhancedFindings: EnhancedFinding[];
  fusionFindings: Finding[];
  adjustedHealthScore: number;
  coverageSummary: {
    totalCIs: number;
    withPathfinder: number;
    coveragePercent: number;
  };
}

function makeFusionFinding(
  key: string,
  title: string,
  description: string,
  severity: 'critical' | 'high' | 'medium' | 'low',
  riskScore: number,
  evidence: { table: string; sysId?: string; field?: string; value?: string },
  affectedCount: number,
): Finding {
  const effortTshirt = severity === 'critical' ? 'M' : 'S';
  const effortMap = { XS: [1, 2], S: [2, 4], M: [4, 8], L: [8, 16], XL: [16, 40] } as const;
  const [low, high] = effortMap[effortTshirt];
  const severityScore = { critical: 4, high: 3, medium: 2, low: 1 }[severity];

  return {
    ruleKey: key,
    title,
    description,
    severity,
    severityScore,
    effortTshirt,
    effortHoursLow: low,
    effortHoursHigh: high,
    riskScore,
    compositeScore: computeCompositeScore(severity, effortTshirt, riskScore),
    evidence,
    remediationPattern: key.startsWith('shadow') ? 'ci_deduplication' : 'ci_lifecycle_cleanup',
    remediationDescription: description,
    affectedCount,
    pathfinderRelevant: true,
    pathfinderRecommendation: null,
  };
}

export function computeFusionScore(input: FusionInput): FusionResult {
  const { findings, pathfinderData, cmdbCIs } = input;
  const fusionFindings: Finding[] = [];

  // Index Pathfinder data by CI sys_id
  const pfIndex = new Map<string, FusionCIData>();
  for (const pf of pathfinderData) {
    pfIndex.set(pf.ciSysId, pf);
  }

  // Index CMDB CIs by sys_id
  const cmdbIndex = new Map<string, CmdbCI>();
  if (cmdbCIs) {
    for (const ci of cmdbCIs) {
      cmdbIndex.set(ci.sysId, ci);
    }
  }

  // --- Fusion Rule 1: CMDB says Active, Pathfinder says Idle ---
  if (cmdbCIs) {
    const activeIdleCIs = cmdbCIs.filter((ci) => {
      const pf = pfIndex.get(ci.sysId);
      return (
        pf &&
        ci.operationalStatus === 'Operational' &&
        pf.trafficState === 'idle'
      );
    });
    if (activeIdleCIs.length > 0) {
      fusionFindings.push(
        makeFusionFinding(
          'cmdb_traffic_mismatch_active_idle',
          'CMDB says Active, Pathfinder says Idle',
          `${activeIdleCIs.length} CI(s) are marked Operational in the CMDB but Pathfinder has observed minimal traffic. These CMDB records may be inaccurate.`,
          'critical',
          5,
          { table: 'cmdb_ci', value: `${activeIdleCIs.length} mismatched CIs` },
          activeIdleCIs.length,
        ),
      );
    }

    // --- Fusion Rule 2: CMDB says Retired, Pathfinder says Active ---
    const retiredActiveCIs = cmdbCIs.filter((ci) => {
      const pf = pfIndex.get(ci.sysId);
      return (
        pf &&
        ci.operationalStatus === 'Retired' &&
        pf.trafficState === 'active'
      );
    });
    if (retiredActiveCIs.length > 0) {
      fusionFindings.push(
        makeFusionFinding(
          'cmdb_traffic_mismatch_retired_active',
          'CMDB says Retired, Pathfinder says Active',
          `${retiredActiveCIs.length} CI(s) are marked Retired but Pathfinder observes active traffic. These CIs may still be in use.`,
          'high',
          4,
          { table: 'cmdb_ci', value: `${retiredActiveCIs.length} mismatched CIs` },
          retiredActiveCIs.length,
        ),
      );
    }

    // --- Fusion Rule 3: Class mismatch ---
    const misclassified = cmdbCIs.filter((ci) => {
      const pf = pfIndex.get(ci.sysId);
      return (
        pf?.behavioralClassification &&
        pf.behavioralClassification.classificationConfidence > 75 &&
        pf.behavioralClassification.suggestedClass !== ci.className
      );
    });
    if (misclassified.length > 0) {
      fusionFindings.push(
        makeFusionFinding(
          'cmdb_class_mismatch',
          'CSDM class does not match observed behavior',
          `${misclassified.length} CI(s) should be classified differently based on observed traffic patterns.`,
          'high',
          3,
          { table: 'cmdb_ci', value: `${misclassified.length} misclassified CIs` },
          misclassified.length,
        ),
      );
    }

    // --- Fusion Rule 5: Relationship unconfirmed ---
    let unconfirmedCount = 0;
    for (const pf of pathfinderData) {
      for (const rel of pf.relationshipConfirmations) {
        if (!rel.confirmed) unconfirmedCount++;
      }
    }
    if (unconfirmedCount > 0) {
      fusionFindings.push(
        makeFusionFinding(
          'relationship_unconfirmed',
          'CMDB relationship not confirmed by traffic',
          `${unconfirmedCount} CMDB relationship(s) exist but Pathfinder has not observed traffic between these CIs. The relationships may be stale.`,
          'medium',
          2,
          { table: 'cmdb_rel_ci', value: `${unconfirmedCount} unconfirmed relationships` },
          unconfirmedCount,
        ),
      );
    }
  }

  // --- Fusion Rule 4: Shadow IT detection ---
  const cmdbSysIds = new Set(cmdbCIs?.map((ci) => ci.sysId) ?? []);
  const shadowITCIs = pathfinderData.filter(
    (pf) => pf.trafficState === 'active' && !cmdbSysIds.has(pf.ciSysId),
  );
  if (shadowITCIs.length > 0) {
    fusionFindings.push(
      makeFusionFinding(
        'shadow_it_detection',
        'Active traffic with no CMDB record',
        `${shadowITCIs.length} host(s) have active traffic observed by Pathfinder with no corresponding CI in the CMDB. This is undocumented infrastructure.`,
        'critical',
        5,
        { table: 'cmdb_ci', value: `${shadowITCIs.length} unknown hosts` },
        shadowITCIs.length,
      ),
    );
  }

  // Enhance existing findings with Pathfinder data
  const enhancedFindings: EnhancedFinding[] = findings.map((f) => {
    const pf = f.evidence.sysId ? pfIndex.get(f.evidence.sysId) : undefined;
    const sev = f.severity as 'critical' | 'high' | 'medium' | 'low';
    return {
      ...f,
      severity: sev,
      ruleKey: f.category,
      title: '',
      description: '',
      severityScore: { critical: 4, high: 3, medium: 2, low: 1 }[sev] ?? 0,
      effortTshirt: 'M' as const,
      effortHoursLow: 4,
      effortHoursHigh: 8,
      riskScore: 3,
      remediationPattern: '',
      remediationDescription: '',
      affectedCount: 1,
      pathfinderRelevant: !!pf,
      pathfinderRecommendation: null,
      pathfinderConfidence: pf?.confidenceScore,
      pathfinderState: pf?.trafficState,
    };
  });

  // Compute adjusted health score
  const allFindings = [
    ...findings.map((f) => ({
      severity: f.severity as 'critical' | 'high' | 'medium' | 'low',
      affectedCount: 1,
    })),
    ...fusionFindings.map((f) => ({
      severity: f.severity as 'critical' | 'high' | 'medium' | 'low',
      affectedCount: f.affectedCount,
    })),
  ];
  const adjustedHealthScore = computeHealthScore(allFindings);

  const totalCIs = cmdbCIs?.length ?? 0;
  const withPathfinder = pathfinderData.length;

  return {
    enhancedFindings,
    fusionFindings,
    adjustedHealthScore,
    coverageSummary: {
      totalCIs,
      withPathfinder,
      coveragePercent: totalCIs > 0 ? Math.round((withPathfinder / totalCIs) * 100) : 0,
    },
  };
}
