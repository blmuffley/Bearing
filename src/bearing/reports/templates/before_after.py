"""Before/After Comparison report template."""

from __future__ import annotations

REPORT_TYPE = "before_after"
DISPLAY_NAME = "Before/After Comparison"
DESCRIPTION = "Side-by-side assessment comparison with delta scores, resolved findings, and ROI calculation."

SECTIONS = [
    "score_comparison",
    "dimension_deltas",
    "findings_resolved",
    "new_findings",
    "roi_calculation",
    "debt_reduction",
]
