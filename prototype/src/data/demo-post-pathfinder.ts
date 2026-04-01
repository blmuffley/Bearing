/**
 * Mercy Health System -- Post-Pathfinder assessment (30 days later).
 *
 * Canonical source: demo-data.json (post_pathfinder section)
 * This file provides the typed runtime export consumed by the prototype UI.
 */

import demoData from './demo-data.json'

/* ------------------------------------------------------------------ */
/*  Re-export assessment & dimension scores directly from JSON        */
/* ------------------------------------------------------------------ */

const raw = demoData.post_pathfinder

export const postPathfinder = {
  assessment: raw.assessment,

  dimensionScores: raw.dimension_scores.map(d => ({
    dimension: d.dimension,
    score: d.score,
    weight: d.weight,
    details: d.details,
    checks_passed: d.checks_passed,
    checks_total: d.checks_total,
  })),

  /** Full findings array (62 items including fusion findings). */
  topFindings: raw.findings.map(f => ({
    id: f.id,
    severity: f.severity,
    dimension: f.dimension,
    title: f.title,
    affectedCount: f.affected_count,
    fusionSource: f.fusion_source ?? undefined,
    // Extended fields available for detail views
    category: f.category,
    description: f.description,
    affectedCiClass: f.affected_ci_class,
    remediation: f.remediation,
    estimatedEffortHours: f.estimated_effort_hours,
    estimatedCost: f.estimated_cost,
    avennorthProduct: f.avennorth_product,
    automationPotential: f.automation_potential,
  })),

  fusionFindings: {
    shadowIT: raw.fusion_summary.shadow_it,
    ghostCIs: raw.fusion_summary.ghost_cis,
    misclassified: raw.fusion_summary.misclassified,
    relationshipsConfirmed: raw.fusion_summary.relationships_confirmed,
    relationshipsUnconfirmed: raw.fusion_summary.relationships_unconfirmed,
    confidenceGaps: raw.fusion_summary.confidence_gaps,
  },

  improvements: {
    scoreIncrease: raw.improvements.score_increase,
    findingsReduced: raw.improvements.findings_reduced,
    criticalReduced: raw.improvements.critical_reduced,
    debtReduced: raw.improvements.debt_reduced,
    cisDiscovered: raw.improvements.cis_discovered,
    integrationsDiscovered: raw.improvements.integrations_discovered,
    orphansResolved: raw.improvements.orphans_resolved,
    duplicatesResolved: raw.improvements.duplicates_resolved,
  },

  debtByDimension: raw.debt_by_dimension,

  maturity: raw.maturity,

  recommendations: raw.recommendations,
}
