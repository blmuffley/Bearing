# Bearing — Business Case

## Executive Summary

Bearing is a low-cost/free CMDB health assessment tool that generates demand for Avennorth's primary revenue products (Pathfinder at $50-150K/yr, Contour bundled). By quantifying CMDB technical debt in dollar terms, Bearing transforms an abstract infrastructure problem into a concrete business case that justifies Pathfinder and Contour purchases.

## Revenue Model

Bearing's direct revenue is minimal by design. Its value is as a demand-generation engine:

| Revenue Stream | Annual Revenue | Notes |
|---------------|---------------|-------|
| One-time assessments ($5K) | $50-100K | 10-20 assessments/year |
| Continuous monitoring ($3K/mo) | $72-180K | 2-5 customers |
| **Pathfinder sales generated** | **$500K-1.5M** | 10-30 Pathfinder licenses at $50K avg |
| **Contour sales generated** | **$200-600K** | Bundled with Pathfinder |

## Cost Structure

| Cost | Annual | Notes |
|------|--------|-------|
| Development | $150-200K | 1-2 engineers part-time |
| Infrastructure | $2-5K | Single container deployment |
| Claude API | $5-10K | AI summaries (~$0.50/assessment) |
| **Total** | **$157-215K** | |

## ROI Calculation

Conservative scenario (Year 1):
- 15 Bearing assessments → 8 convert to Pathfinder ($50K avg) = **$400K**
- 3 convert to Contour bundle (+$30K avg) = **$90K**
- Direct Bearing revenue = **$75K**
- **Total revenue attributable to Bearing: $565K**
- **Cost: $180K**
- **ROI: 214%**

## Demo Data: Mercy Health System

The Mercy Health System demo illustrates the before/after story:

### Before Pathfinder
- CMDB Health: **34/100** (Grade F)
- Maturity: **Level 1 — Ad-hoc**
- Technical Debt: **$2.4M**
- Key issues: 12,420 CIs with no dependencies, 82% unvalidated, no CSDM

### After Pathfinder (30 days)
- CMDB Health: **82/100** (Grade B)
- Maturity: **Level 3 — Defined**
- Technical Debt: **$620K** (reduced by $1.8M)
- Pathfinder discovered: 6,400 CIs validated, 382 integrations found, 34 shadow IT systems

### The Pitch
"Your CMDB has $2.4M in technical debt. Pathfinder costs $50K/year and reduced a comparable customer's debt by $1.8M in 30 days. That's a 36x ROI."

## Competitive Landscape

No direct competitor offers this assessment-to-remediation pipeline:
- ServiceNow Health Scan: basic, not monetizable, no fusion findings
- Armis: device-focused, not CMDB health assessment
- BMC Discovery: discovery tool, not assessment platform
- Custom scripts: one-off, not productized, no executive reporting

Bearing's moat: the assessment-to-SOW pipeline, calibration feedback loop, and Pathfinder fusion scoring are all provisional patent claims.
