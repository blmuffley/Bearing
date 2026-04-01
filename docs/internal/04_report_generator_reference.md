# Report Generator Reference

**Internal Engineering Reference**
Last updated: 2026-04-01 | Version: 0.1.0

---

## Overview

Bearing generates assessment reports in two formats: PDF and DOCX. Both use Avennorth branding (colors, typography, layout). Reports are generated on-demand via API endpoints and returned as binary downloads.

**Source files**:
- `src/bearing/reports/pdf.py` -- PDF generation using fpdf2
- `src/bearing/reports/docx_report.py` -- DOCX generation using python-docx
- `src/bearing/reports/charts.py` -- Chart generation using matplotlib
- `src/bearing/reports/templates/` -- Report template definitions

---

## Report Types

Five report templates are defined in `src/bearing/reports/templates/`:

| Report Type | File | Description |
|---|---|---|
| `health_scorecard` | `health_scorecard.py` | Single-page summary: overall score, dimension scores, top findings, maturity level |
| `before_after` | `before_after.py` | Side-by-side assessment comparison with delta scores, resolved findings, ROI |
| `maturity_report` | `maturity_report.py` | Maturity level assessment with progression roadmap |
| `recommendations` | `recommendations.py` | Prioritized remediation recommendations |
| `technical_debt` | `technical_debt.py` | Detailed technical debt breakdown by dimension |

Currently, only the `health_scorecard` template has full PDF and DOCX implementations. The other templates define their section structure but rely on the same generator classes.

---

## PDF Generation (fpdf2)

### BearingPDF Class

`BearingPDF` extends `fpdf2.FPDF` to provide Avennorth branding:

```python
class BearingPDF(FPDF):
    def header(self):
        # "AVENNORTH BEARING" left-aligned, gray text
        # "CMDB Health Assessment" right-aligned
        # Electric lime horizontal rule
    
    def footer(self):
        # "Page X/Y" centered, gray italic
```

Every page in a Bearing PDF inherits this header and footer automatically.

### Brand Colors (RGB tuples)

| Color | Name | RGB | Hex |
|---|---|---|---|
| Obsidian | Dark background/text | (28, 25, 23) | #1C1917 |
| Electric Lime | Accent/highlights | (57, 255, 20) | #39FF14 |
| White | Light text | (250, 250, 249) | #FAFAF9 |
| Gray | Secondary text | (168, 162, 158) | #A8A29E |

### Score Color Coding

Scores and severities use contextual colors:

**Score thresholds**:
- 75+ = Green (34, 197, 94) / #22C55E
- 40-74 = Amber (245, 158, 11) / #F59E0B
- 0-39 = Red (239, 68, 68) / #EF4444

**Severity colors**:
- Critical = Red (239, 68, 68)
- High = Amber (245, 158, 11)
- Medium = Yellow (234, 179, 8)
- Low = Blue (59, 130, 246)
- Info = Gray (168, 162, 158)

### Health Scorecard PDF Layout

The `generate_health_scorecard()` method produces a single-page PDF:

1. **Title**: "CMDB Health Scorecard" in 24pt Helvetica Bold, Obsidian
2. **Assessment name**: 12pt, Gray
3. **Overall score**: 48pt bold with score color, followed by "/100 (Grade: X)" in 14pt
4. **Maturity level**: 14pt bold -- "Maturity Level: X - Label"
5. **Key metrics**: 12pt -- Technical debt estimate, total findings (critical count), CIs assessed
6. **Dimension scores table**: Header row with Obsidian background, white text. Columns: Dimension, Score (color-coded), Weight (%), Status (Good/Needs Work/Critical)
7. **Top 5 findings**: Sorted by severity. Severity label in color, title text in Obsidian.

### Font Limitations

fpdf2 uses built-in PDF fonts (Helvetica, Courier, Times). Key limitations:

- **No custom fonts**: The Avennorth brand specifies Syne (headings), DM Sans (body), and Space Mono (code). These are NOT available in fpdf2 without embedding. The current implementation uses Helvetica throughout.
- **Unicode support**: Helvetica is limited to Latin-1 characters. Unicode characters (em-dashes, smart quotes, non-Latin text) will render as `?` or blank. Workaround: sanitize text before rendering, replace smart quotes with straight quotes, em-dashes with double hyphens.
- **Embedding custom fonts**: fpdf2 supports TTF font embedding via `add_font()`. To add brand fonts, place TTF files in the project and call `pdf.add_font("Syne", "", "path/to/Syne-Regular.ttf", uni=True)`. This enables Unicode support for that font.

### Adding a New PDF Report Template

1. Create a template definition in `src/bearing/reports/templates/your_template.py` with `REPORT_TYPE`, `DISPLAY_NAME`, `DESCRIPTION`, and `SECTIONS`.
2. Add a `generate_your_template()` method to `PDFReportGenerator`.
3. Create a `BearingPDF` instance, add pages, and build content using fpdf2 methods.
4. Return `BytesIO.getvalue()` for the PDF bytes.
5. Add a route handler in `routes.py` that calls the new generator method.

---

## DOCX Generation (python-docx)

### DOCXReportGenerator Class

Uses `python-docx` to build Word documents. No template file is used -- documents are built programmatically from a blank `Document()`.

### Brand Colors (RGBColor objects)

```python
OBSIDIAN_RGB = RGBColor(0x1C, 0x19, 0x17)
LIME_RGB = RGBColor(0x39, 0xFF, 0x14)
GRAY_RGB = RGBColor(0xA8, 0xA2, 0x9E)
```

### Health Scorecard DOCX Layout

1. **Title**: Heading level 0, "CMDB Health Scorecard", Obsidian color
2. **Assessment name**: Paragraph with Gray text
3. **Overall score**: 36pt bold run with score color, followed by grade in 16pt
4. **Key metrics**: Standard paragraphs -- maturity level, debt estimate, finding counts, CI count
5. **Dimension scores table**: "Light Shading Accent 1" style. Headers: Dimension, Score, Weight, Status. One row per dimension.
6. **Top 10 findings**: Bold severity label in brackets, followed by finding title
7. **AI Summary**: If `assessment.ai_summary` is non-empty, adds an "AI Analysis" section
8. **Footer**: "Generated by Avennorth Bearing" centered, 8pt Gray

### Styling Approach

python-docx provides built-in styles (`Light Shading Accent 1`, heading levels, etc.) but limited control over colors and fonts. Key patterns:

- **Run-level formatting**: Color, size, and bold are set on individual `Run` objects, not paragraphs.
- **Table styles**: Built-in Word table styles are used. Custom table formatting requires XML manipulation.
- **No embedded images**: The current DOCX generator does not embed charts. To add charts, generate PNG images with matplotlib and use `doc.add_picture(BytesIO(png_bytes), width=Inches(6))`.

### Adding Charts to DOCX

The `charts.py` module generates PNG chart images that can be embedded:

```python
from bearing.reports.charts import generate_dimension_bar_chart, generate_score_donut

bar_chart_png = generate_dimension_bar_chart(scores)
donut_png = generate_score_donut(overall_score)

# Embed in DOCX
doc.add_picture(BytesIO(bar_chart_png), width=Inches(6))
doc.add_picture(BytesIO(donut_png), width=Inches(3))
```

---

## Chart Generation (matplotlib)

### Configuration

matplotlib is configured with the `Agg` backend (non-interactive, server-safe):

```python
import matplotlib
matplotlib.use("Agg")
```

This must be set before importing `pyplot`. It enables rendering without a display server.

### Avennorth Chart Colors

Charts use a dark theme matching the Avennorth brand:

- Background: `#0A0A0A` (near-black)
- Text: white
- Axis spines: `#A8A29E` (Gray)
- Bars/wedges: score-dependent (green/amber/red)

### Dimension Bar Chart

`generate_dimension_bar_chart(scores)` produces a horizontal bar chart:

- Figure size: 10x5 inches
- Bars: color-coded by score (green/amber/red)
- Y-axis: dimension names (title-cased)
- X-axis: 0-100 scale
- Score labels: white text to the right of each bar
- Output: PNG at 150 DPI

### Score Donut

`generate_score_donut(score)` produces a donut chart:

- Figure size: 4x4 inches
- Wedge width: 0.3 (donut hole in center)
- Score color: green/amber/red
- Remaining arc: dark gray `#292524`
- Center text: score value in 36pt white bold, "/100" in 12pt gray below
- Output: PNG at 150 DPI

### Memory Management

Both chart functions create matplotlib figures, render to a `BytesIO` buffer, call `plt.close(fig)`, and return the buffer contents. The explicit `close()` prevents memory leaks in long-running processes.

---

## API Endpoints for Reports

### Generate PDF Report

```
POST /api/v1/reports/{assessment_id}/pdf
Content-Type: application/json

Request body:
{
  "report_type": "health_scorecard",
  "format": "pdf"
}

Response:
Content-Type: application/pdf
Content-Disposition: attachment; filename="bearing_health_scorecard_abc12345.pdf"
```

### Generate DOCX Report

```
POST /api/v1/reports/{assessment_id}/docx
Content-Type: application/json

Request body:
{
  "report_type": "health_scorecard",
  "format": "docx"
}

Response:
Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document
Content-Disposition: attachment; filename="bearing_health_scorecard_abc12345.docx"
```

Both endpoints return 404 if the assessment ID is not found.

---

## Known Limitations and Workarounds

1. **Helvetica only in PDF**: Brand fonts (Syne, DM Sans, Space Mono) are not embedded. To add them, acquire TTF files and register with `pdf.add_font()`.

2. **No chart embedding in DOCX**: The DOCX generator produces text-only reports. Charts from `charts.py` can be embedded using `doc.add_picture()` but this is not yet implemented.

3. **Unicode in PDF**: Characters outside Latin-1 (curly quotes, em-dashes, accented characters beyond Western European) will fail to render. Pre-process text through a sanitization function.

4. **Single template implemented**: Only `health_scorecard` has full generator implementations. Other templates define sections but need generator methods.

5. **No cover page**: Neither PDF nor DOCX includes a branded cover page with Avennorth logo. The logo would need to be loaded from a file path and embedded.

6. **Static layout**: The PDF layout does not dynamically adjust for varying numbers of findings or dimensions. With 8 dimensions and 5 findings, it fits on one page. More content may overflow.
