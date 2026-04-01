"""Recommendations report template."""

from __future__ import annotations

REPORT_TYPE = "recommendations"
DISPLAY_NAME = "Recommendation Report"
DESCRIPTION = "Prioritized remediation actions with effort and impact estimates, grouped by dimension."

SECTIONS = [
    "executive_summary",
    "prioritized_actions",
    "effort_impact_matrix",
    "avennorth_product_recommendations",
    "implementation_timeline",
]
