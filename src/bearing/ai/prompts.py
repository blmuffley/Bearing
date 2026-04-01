"""Prompt templates for AI-powered analysis."""

from __future__ import annotations

from bearing.api.schemas import AssessmentResponse, DimensionScoreResponse, FindingResponse


def build_executive_summary_prompt(
    assessment: AssessmentResponse,
    scores: list[DimensionScoreResponse],
    findings: list[FindingResponse],
) -> str:
    """Build a prompt for generating an executive summary of the assessment."""
    dimension_lines = "\n".join(
        f"  - {s.dimension.value.replace('_', ' ').title()}: {s.score}/100 (weight: {s.weight:.0%})"
        for s in scores
    )

    critical_findings = [f for f in findings if f.severity.value == "critical"]
    finding_lines = "\n".join(
        f"  - [{f.severity.value.upper()}] {f.title} ({f.affected_count} affected)"
        for f in sorted(findings, key=lambda x: {"critical": 0, "high": 1, "medium": 2, "low": 3}.get(x.severity.value, 4))[:10]
    )

    return f"""You are an expert ServiceNow CMDB consultant writing an executive summary for a CMDB health assessment. Write a clear, actionable 3-4 paragraph summary suitable for a CIO or VP of IT.

Assessment Results:
- Overall Health Score: {assessment.overall_score}/100 (Grade: {assessment.grade})
- Maturity Level: {assessment.maturity_level}/5 ({assessment.maturity_label})
- Technical Debt Estimate: ${assessment.technical_debt_estimate:,.0f}
- Total Findings: {assessment.findings_count} ({assessment.critical_findings} critical)
- CIs Assessed: {assessment.ci_count_assessed:,}
- Pathfinder Data Available: {assessment.has_pathfinder_data}

Dimension Scores:
{dimension_lines}

Top Findings:
{finding_lines}

Write the summary in plain English. Lead with the key business impact. Explain what the score means operationally. Identify the top 2-3 areas that need immediate attention. End with a clear recommendation for next steps.

Do NOT use jargon without explaining it. Do NOT be generic — reference specific numbers from this assessment."""


def build_recommendation_prompt(
    assessment: AssessmentResponse,
    scores: list[DimensionScoreResponse],
) -> str:
    """Build a prompt for generating detailed remediation recommendations."""
    lowest = sorted(scores, key=lambda s: s.score)[:3]
    dim_details = "\n".join(
        f"  - {s.dimension.value}: {s.score}/100 — {s.details}"
        for s in lowest
    )

    return f"""You are an expert ServiceNow CMDB consultant. Based on the following assessment results, provide 5 specific, actionable remediation recommendations.

Overall Score: {assessment.overall_score}/100
Maturity Level: {assessment.maturity_level} ({assessment.maturity_label})

Lowest-scoring dimensions:
{dim_details}

For each recommendation:
1. Give a clear title
2. Explain what to do (specific steps)
3. Estimate the effort (hours)
4. Explain the expected impact on the health score
5. Note if Avennorth Pathfinder or Contour can automate this

Be specific and practical. These recommendations will be included in a report for the customer's IT leadership team."""
