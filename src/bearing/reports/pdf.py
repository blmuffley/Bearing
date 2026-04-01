"""PDF report generator using fpdf2 with Avennorth branding."""

from __future__ import annotations

import logging
from io import BytesIO

from fpdf import FPDF

from bearing.api.schemas import AssessmentResponse, DimensionScoreResponse, FindingResponse

logger = logging.getLogger(__name__)

# Avennorth brand colors (RGB)
OBSIDIAN = (28, 25, 23)
ELECTRIC_LIME = (57, 255, 20)
WHITE = (250, 250, 249)
GRAY = (168, 162, 158)


class BearingPDF(FPDF):
    """Avennorth-branded PDF document."""

    def header(self) -> None:
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(*GRAY)
        self.cell(0, 10, "AVENNORTH BEARING", align="L")
        self.cell(0, 10, "CMDB Health Assessment", align="R", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(*ELECTRIC_LIME)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(5)

    def footer(self) -> None:
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(*GRAY)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align="C")


class PDFReportGenerator:
    """Generates branded PDF reports for assessments."""

    def generate_health_scorecard(
        self,
        assessment: AssessmentResponse,
        scores: list[DimensionScoreResponse],
        findings: list[FindingResponse],
    ) -> bytes:
        """Generate a CMDB Health Scorecard PDF.

        Single-page summary: overall score, dimension scores,
        top findings, maturity level.
        """
        pdf = BearingPDF()
        pdf.alias_nb_pages()
        pdf.add_page()

        # Title
        pdf.set_font("Helvetica", "B", 24)
        pdf.set_text_color(*OBSIDIAN)
        pdf.cell(0, 15, "CMDB Health Scorecard", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 12)
        pdf.set_text_color(*GRAY)
        pdf.cell(0, 8, assessment.name, new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)

        # Overall score
        pdf.set_font("Helvetica", "B", 48)
        score_color = self._score_color(assessment.overall_score)
        pdf.set_text_color(*score_color)
        pdf.cell(60, 30, f"{assessment.overall_score}", new_x="END")
        pdf.set_font("Helvetica", "", 14)
        pdf.set_text_color(*OBSIDIAN)
        pdf.cell(0, 30, f"/ 100  (Grade: {assessment.grade})", new_x="LMARGIN", new_y="NEXT")

        # Maturity level
        pdf.set_font("Helvetica", "B", 14)
        pdf.cell(0, 10, f"Maturity Level: {assessment.maturity_level} - {assessment.maturity_label}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(3)

        # Technical debt
        pdf.set_font("Helvetica", "", 12)
        pdf.cell(0, 8, f"Estimated Technical Debt: ${assessment.technical_debt_estimate:,.0f}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, f"Total Findings: {assessment.findings_count} ({assessment.critical_findings} critical)", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, f"CIs Assessed: {assessment.ci_count_assessed:,}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)

        # Dimension scores table
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_fill_color(*OBSIDIAN)
        pdf.set_text_color(*WHITE)
        pdf.cell(80, 8, "Dimension", fill=True)
        pdf.cell(30, 8, "Score", align="C", fill=True)
        pdf.cell(30, 8, "Weight", align="C", fill=True)
        pdf.cell(50, 8, "Status", align="C", fill=True, new_x="LMARGIN", new_y="NEXT")

        pdf.set_font("Helvetica", "", 10)
        for score in scores:
            pdf.set_text_color(*OBSIDIAN)
            pdf.cell(80, 7, score.dimension.value.replace("_", " ").title())
            color = self._score_color(score.score)
            pdf.set_text_color(*color)
            pdf.cell(30, 7, str(score.score), align="C")
            pdf.set_text_color(*GRAY)
            pdf.cell(30, 7, f"{score.weight:.0%}", align="C")
            status = "Good" if score.score >= 75 else "Needs Work" if score.score >= 40 else "Critical"
            pdf.cell(50, 7, status, align="C", new_x="LMARGIN", new_y="NEXT")

        # Top 5 findings
        pdf.ln(5)
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_text_color(*OBSIDIAN)
        pdf.cell(0, 10, "Top Findings", new_x="LMARGIN", new_y="NEXT")

        critical_findings = sorted(
            findings,
            key=lambda f: {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}.get(f.severity.value, 5),
        )[:5]

        pdf.set_font("Helvetica", "", 9)
        for finding in critical_findings:
            severity_color = self._severity_color(finding.severity.value)
            pdf.set_text_color(*severity_color)
            pdf.cell(20, 6, finding.severity.value.upper())
            pdf.set_text_color(*OBSIDIAN)
            pdf.cell(0, 6, finding.title[:80], new_x="LMARGIN", new_y="NEXT")

        output = BytesIO()
        pdf.output(output)
        return output.getvalue()

    @staticmethod
    def _score_color(score: int) -> tuple[int, int, int]:
        if score >= 75:
            return (34, 197, 94)  # green
        if score >= 40:
            return (245, 158, 11)  # amber
        return (239, 68, 68)  # red

    @staticmethod
    def _severity_color(severity: str) -> tuple[int, int, int]:
        colors = {
            "critical": (239, 68, 68),
            "high": (245, 158, 11),
            "medium": (234, 179, 8),
            "low": (59, 130, 246),
            "info": (168, 162, 158),
        }
        return colors.get(severity, (168, 162, 158))
