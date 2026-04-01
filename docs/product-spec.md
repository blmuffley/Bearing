# Bearing — Product Specification

## Product Summary

Avennorth Bearing is a CMDB health assessment platform for ServiceNow. It scores CMDB quality across eight dimensions, quantifies technical debt in dollars, assigns a maturity level, and generates executive-ready reports.

## Market Position

Bearing is the **wedge product** in the Avennorth portfolio:

1. **Get in the door** — free or low-cost assessment during consulting engagements
2. **Reveal the problem** — quantify CMDB gaps in terms the C-suite understands
3. **Sell the fix** — Pathfinder + Contour are the obvious remediation
4. **Measure progress** — re-run Bearing after deployment to prove ROI

## Pricing

| Offering | Price | Purpose |
|----------|-------|---------|
| Bearing Assessment (one-time) | Free / $5K | Wedge. Get in the door. |
| Bearing Continuous | $2-5K/month | Ongoing scheduled assessments + trend tracking + alerts |
| Bearing + Pathfinder Bundle | Assessment free | Included with Pathfinder subscription |
| CoreX Engagement | Included | Every consulting engagement includes Bearing |

## Target Buyers

| Persona | Pain Point | Bearing Value |
|---------|-----------|--------------|
| VP of IT Operations | "I don't know how healthy our CMDB is" | Quantified health score + maturity level |
| CMDB Manager | "I can't justify the budget for CMDB cleanup" | Dollar-value technical debt estimate |
| ServiceNow Platform Owner | "We bought Discovery but I can't prove it's working" | Before/after comparison, ROI calculation |
| CIO | "How do we compare to our peers?" | Industry benchmarking (future) |

## The Sales Motion

1. CoreX consultant deploys Bearing assessment (free)
2. Bearing reveals: "Your CMDB is 34% healthy. $2.4M in technical debt."
3. Consultant: "Pathfinder fixes this automatically. $50K/yr, deployed in 2 weeks."
4. Customer buys Pathfinder. 30 days later, re-run Bearing: "CMDB now 82% healthy."
5. Consultant: "Now let's map this into CSDM with Contour."

## Key Features

### Assessment
- Eight-dimension CMDB health scoring (0-100)
- Five-level maturity model (Ad-hoc → Optimized)
- Technical debt quantification in dollars
- Configurable cost parameters per customer

### Fusion (with Pathfinder)
- Shadow IT detection
- Ghost CI identification
- Behavioral misclassification detection
- Relationship validation via traffic observation
- Confidence gap analysis

### Reporting
- CMDB Health Scorecard (single-page summary)
- Technical Debt Summary (cost breakdown by category)
- Maturity Model Report (current level + roadmap)
- Recommendation Report (prioritized remediation actions)
- Before/After Comparison (delta analysis + ROI)
- AI-generated executive narratives (optional, via Claude)

### Continuous Assessment
- Scheduled recurring assessments (cron-based)
- Trend tracking across assessment runs
- Degradation alerts when scores drop

## Constraints

1. Standalone operation — works without any other Avennorth product
2. Read-only CMDB access — never modifies customer CI data
3. Discovery-agnostic — works with any discovery source
4. AI is optional — all scoring is deterministic
5. ServiceNow Utah+ compatible
