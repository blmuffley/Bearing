# Bearing Report Types

## What Bearing Delivers After Every Assessment

Bearing generates five report types from every assessment. Each report serves a different audience and purpose. This document describes what is in each report, who should receive it, and includes sample sections from a real assessment of a healthcare organization with 18,000 CIs.

---

## Report 1: CMDB Health Scorecard

### What It Is
A single-page executive summary that communicates the overall health of the CMDB at a glance. This is the report you hand to a CIO or VP of IT when they ask "how healthy is our CMDB?"

### Who It Is For
- Executive leadership (CIO, VP of IT, VP of Infrastructure)
- Service management leadership
- IT governance and audit committees

### What It Contains
- Overall health score (0-100) with letter grade
- Current maturity level (1-5) with label
- Total technical debt estimate in hours and dollars
- Count of CIs assessed
- Total findings count with critical findings highlighted
- Dimension score summary (eight dimensions with scores)
- Top 5 critical findings by impact
- Recommended next steps (2-3 sentences)

### When to Use It
- Initial stakeholder briefing after a first assessment
- Board or steering committee updates
- Budget justification for CMDB improvement initiatives

### Sample Section

> **CMDB Health Scorecard -- Mercy Health System**
>
> **Assessment Date:** February 15, 2026
> **CIs Assessed:** 18,000
> **ServiceNow Version:** Vancouver Patch 3
>
> | Metric | Value |
> |--------|-------|
> | Overall Health Score | 34/100 |
> | Grade | F |
> | Maturity Level | Level 1 -- Ad-Hoc |
> | Total Findings | 214 |
> | Critical Findings | 47 |
> | Estimated Technical Debt | $2,400,000 |
>
> **Dimension Summary:**
> Completeness: 42 | Accuracy: 18 | Currency: 28 | Relationships: 31
> CSDM: 12 | Classification: 55 | Orphans: 38 | Duplicates: 48
>
> **Top Critical Findings:**
> 1. 12,420 CIs have no service dependencies mapped (69% of total)
> 2. 14,760 CIs have no discovery validation (82% of total)
> 3. CSDM Business Service layer is not populated
> 4. 1,200 CIs not updated in 180+ days
> 5. 2,800 servers with no application mapping

---

## Report 2: Technical Debt Summary

### What It Is
A detailed breakdown of technical debt by dimension, severity, and remediation effort. This report translates CMDB quality gaps into work items with time estimates, so teams can plan remediation as a project with defined scope.

### Who It Is For
- CMDB managers and data stewards
- ServiceNow platform team leads
- Project managers planning remediation engagements
- Finance teams evaluating remediation investment

### What It Contains
- Total technical debt estimate with hour and dollar ranges
- Debt breakdown by dimension (pie chart or table)
- Debt breakdown by severity (critical, high, medium, low)
- Detailed finding list with effort estimates per finding
- Quick wins section: high-severity findings with low effort
- Effort distribution by role type (administrator, developer, architect)

### When to Use It
- Remediation project scoping
- Budget requests for CMDB improvement
- Resource allocation and capacity planning
- Vendor SOW review and negotiation

### Sample Section

> **Technical Debt by Dimension -- Mercy Health System**
>
> | Dimension | Findings | Est. Hours | Est. Cost |
> |-----------|----------|-----------|-----------|
> | Relationships | 58 | 1,420 | $284,000 |
> | Accuracy | 42 | 680 | $136,000 |
> | Currency | 31 | 560 | $112,000 |
> | CSDM Alignment | 24 | 560 | $112,000 |
> | Orphans | 22 | 440 | $88,000 |
> | Completeness | 19 | 360 | $72,000 |
> | Classification | 12 | 240 | $48,000 |
> | Duplicates | 6 | 120 | $24,000 |
> | **Total** | **214** | **4,380** | **$876,000** |
>
> **Quick Wins (High Severity, Low Effort):**
> - Standardize vendor names across 1,400 CIs (60 hours)
> - Fix zero-value RAM/CPU fields on 780 servers (40 hours)
> - Retire 85 retired CIs with open incidents (40 hours)
> - Enable dedup rules for serial number matching (20 hours)

---

## Report 3: Maturity Model Report

### What It Is
A detailed assessment of your current CMDB maturity level with a roadmap showing what it takes to advance to the next level. This report frames CMDB improvement as a journey with clear milestones rather than an overwhelming list of problems.

### Who It Is For
- CMDB program sponsors
- IT leadership planning multi-year improvement initiatives
- ServiceNow Center of Excellence teams
- Consultants building remediation roadmaps

### What It Contains
- Current maturity level with detailed justification
- Criteria met and not met for the current level
- Requirements for the next maturity level
- Recommended initiatives to advance (with effort estimates)
- Timeline estimate for reaching the next level
- Long-term maturity roadmap (current level through Level 5)

### When to Use It
- Strategic planning for CMDB programs
- Annual IT roadmap development
- Progress tracking across quarterly or annual review cycles
- Executive presentations on CMDB program investment

### Sample Section

> **Maturity Assessment -- Mercy Health System**
>
> **Current Level: 1 -- Ad-Hoc**
>
> Mercy Health System's CMDB is at the earliest stage of maturity. While 18,000 CIs exist in the database, the data was primarily entered manually and has not been validated by automated discovery. No CSDM layers beyond basic infrastructure are populated. Relationships are sparse, with 69% of CIs having no dependencies mapped.
>
> **Criteria Assessment for Level 1:**
> - Manual CI entry only -- Confirmed. 82% of CIs have no discovery validation.
> - No automated discovery -- Partially confirmed. Discovery licenses exist but schedules have not run successfully in 60+ days.
> - No CSDM adoption -- Confirmed. Only the Infrastructure layer is populated.
> - Health score below 30 -- Score is 34, marginally above the Level 1 ceiling.
>
> **Requirements to Reach Level 2 -- Reactive:**
> 1. Restore discovery schedules to active operation (Est. 40 hours)
> 2. Expand discovery to cover at least 30% of infrastructure (Est. 160 hours)
> 3. Populate basic CI attributes for discovered assets (included in discovery)
> 4. Map relationships for the top 25 critical applications (Est. 200 hours)
>
> **Estimated timeline to Level 2:** 8-12 weeks with dedicated resources

---

## Report 4: Recommendation Report

### What It Is
A prioritized list of remediation actions, ordered by the combination of severity, effort, and business risk. Each recommendation includes what to do, why it matters, how long it will take, and what the expected impact on the health score will be.

### Who It Is For
- CMDB administrators executing remediation
- ServiceNow platform teams
- Project managers tracking remediation progress
- Consultants delivering remediation engagements

### What It Contains
- Prioritized recommendations grouped into phases (quick wins, short-term, medium-term, long-term)
- For each recommendation: title, description, affected CI count, severity, estimated effort, expected score impact
- Dependencies between recommendations (what must be done first)
- Resource requirements by role type
- Automation potential for each recommendation (high, medium, low)

### When to Use It
- Sprint or phase planning for remediation work
- Daily/weekly team stand-ups during active remediation
- Progress reporting to stakeholders
- Adjusting remediation priorities as work progresses

### Sample Section

> **Phase 1: Quick Wins (Weeks 1-4) -- Mercy Health System**
>
> These recommendations deliver the highest score impact for the lowest effort. Complete these first.
>
> | Priority | Recommendation | Effort | Expected Impact |
> |----------|---------------|--------|----------------|
> | 1 | Restore failed discovery schedules for 3 network segments | 40 hrs | +4 to Currency score |
> | 2 | Retire 1,200 CIs stale for 180+ days (after validation) | 80 hrs | +6 to Currency score |
> | 3 | Fix zero-value hardware specs on 780 servers | 40 hrs | +3 to Accuracy score |
> | 4 | Standardize vendor names across 1,400 CIs | 60 hrs | +2 to Accuracy score |
> | 5 | Enable CMDB deduplication rules | 20 hrs | +2 to Duplicates score |
> | 6 | Retire 85 retired CIs with open incidents | 40 hrs | +1 to Currency score |
>
> **Phase 1 Total:** 280 hours
> **Expected Overall Score Impact:** +8 to +12 points (34 to approximately 44)
>
> **Phase 2: Relationship Foundation (Weeks 5-12)**
>
> | Priority | Recommendation | Effort | Expected Impact |
> |----------|---------------|--------|----------------|
> | 7 | Map dependencies for top 45 Tier 1 applications | 360 hrs | +8 to Relationships |
> | 8 | Map server-to-application relationships for 2,800 servers | 240 hrs | +6 to Relationships |
> | 9 | Map database-to-application relationships for 180 databases | 120 hrs | +3 to Relationships |
> | 10 | Resolve 1,860 orphaned servers | 280 hrs | +7 to Orphans |

---

## Report 5: Before/After Comparison

### What It Is
A side-by-side analysis showing how CMDB health has changed between two assessment points. This report is available after your second (or subsequent) Bearing assessment and demonstrates the measurable impact of remediation work.

### Who It Is For
- Executive sponsors who need to see return on investment
- CMDB program managers tracking progress
- Teams that want to celebrate wins and identify remaining gaps
- Budget holders evaluating whether to continue investment

### What It Contains
- Side-by-side health scores with delta
- Side-by-side maturity levels
- Dimension score comparison with per-dimension improvement
- Technical debt reduction (hours and dollars)
- Findings resolved versus findings remaining
- New findings introduced (if any)
- Key improvement metrics (CIs discovered, relationships created, duplicates resolved, orphans resolved)

### When to Use It
- Quarterly business reviews
- Program milestone celebrations
- Budget renewal requests ("here is what we achieved, here is what remains")
- Demonstrating the value of continuous assessment

### Sample Section

> **Before/After -- Mercy Health System**
> **Baseline:** February 15, 2026 | **Follow-up:** March 15, 2026 (30 days)
>
> | Metric | Before | After | Change |
> |--------|--------|-------|--------|
> | Overall Score | 34 | 82 | +48 |
> | Grade | F | B | -- |
> | Maturity Level | Level 1 (Ad-Hoc) | Level 4 (Managed) | +3 levels |
> | Total Findings | 214 | 62 | -152 resolved |
> | Critical Findings | 47 | 5 | -42 resolved |
> | Technical Debt | $2,400,000 | $340,000 | -$2,060,000 |
>
> **Dimension Score Changes:**
>
> | Dimension | Before | After | Delta |
> |-----------|--------|-------|-------|
> | Completeness | 42 | 78 | +36 |
> | Accuracy | 18 | 85 | +67 |
> | Currency | 28 | 82 | +54 |
> | Relationships | 31 | 88 | +57 |
> | CSDM | 12 | 65 | +53 |
> | Classification | 55 | 89 | +34 |
> | Orphans | 38 | 91 | +53 |
> | Duplicates | 48 | 85 | +37 |
>
> **Key Improvements:**
> - 2,340 new CIs discovered through expanded discovery and Pathfinder deployment
> - 148 integrations discovered through network traffic observation
> - 3,200 orphaned CIs resolved with newly mapped relationships
> - 290 duplicate CIs merged
>
> *Note: The dramatic improvement in this example reflects the combined effect of Bearing assessment + Pathfinder deployment + active remediation over a 30-day period.*

---

## Report Formats and Customization

All Bearing reports are available in PDF and DOCX formats. Reports can be customized with your organization's branding, including logo, colors, and legal boilerplate. Your Avennorth representative can configure branding during onboarding.

Reports are generated on demand and can be re-generated at any time from a completed assessment. Assessment data is retained according to your organization's data retention policy.
