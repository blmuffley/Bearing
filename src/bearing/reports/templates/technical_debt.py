"""Technical Debt report template."""

from __future__ import annotations

REPORT_TYPE = "technical_debt"
DISPLAY_NAME = "Technical Debt Summary"
DESCRIPTION = "Dollar-value estimate of CMDB technical debt by category with cost breakdown chart."

SECTIONS = [
    "debt_overview",
    "debt_by_dimension",
    "debt_by_category",
    "cost_assumptions",
    "benchmark_comparison",
]
