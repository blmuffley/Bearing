/**
 * Mercy Health System -- Pre-Pathfinder baseline assessment data.
 *
 * Canonical source: demo-data.json (pre_pathfinder section)
 * This file provides the typed runtime export consumed by the prototype UI.
 */

import demoData from './demo-data.json'

/* ------------------------------------------------------------------ */
/*  Re-export assessment & dimension scores directly from JSON        */
/* ------------------------------------------------------------------ */

const raw = demoData.pre_pathfinder

export const prePathfinder = {
  assessment: raw.assessment,

  dimensionScores: raw.dimension_scores.map(d => ({
    dimension: d.dimension,
    score: d.score,
    weight: d.weight,
    details: d.details,
    checks_passed: d.checks_passed,
    checks_total: d.checks_total,
  })),

  /** Full findings array (214 items). Used by Findings Explorer with filtering/sorting. */
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

  debtByDimension: raw.debt_by_dimension,

  maturity: raw.maturity,

  recommendations: raw.recommendations,
}
