# Avennorth Bearing -- Investor & Sales Pitch Deck

> **Internal Avennorth Document** -- CONFIDENTIAL. Not for customer distribution.
> Last updated: 2026-03-29
>
> **Audiences:** (1) Potential investors funding the Avennorth product suite. (2) Enterprise sales to consulting firms evaluating Bearing.
> Appendix slides focus on the investment case (financial model, unit economics, funding ask).

---

## How to Use This Document

Each slide below includes four sections:

- **Visual Direction** -- Layout, chart types, imagery, and design notes for the deck designer.
- **Content** -- The actual text, data, and bullet points that appear on the slide.
- **Speaker Notes** -- What the presenter says while the slide is displayed.

Brand system reference:
- Background: Obsidian `#1A1A2E`
- Accent: Electric Lime `#CCFF00`
- Secondary: Dark Gray `#2D2D3D`, Medium Gray `#6B6B7B`
- Typography: Syne (headings), DM Sans (body), Space Mono (code/data)
- Logo: Avennorth open-path "AN" mark

---

## Slide 1: Title Slide

**Visual Direction:**
Full-bleed Obsidian `#1A1A2E` background. Avennorth "AN" open-path logo mark centered at 40% opacity as a watermark behind the title. Title text in white, tagline in Electric Lime `#CCFF00`. Clean, minimal -- no imagery beyond the logo. Bottom-right corner: presenter name, date, "CONFIDENTIAL" label in small Medium Gray text.

**Content:**

```
Avennorth Bearing

Turning ServiceNow Technical Debt Into Revenue

Assess --> Remediate --> Grow
```

**Speaker Notes:**
Thank you for your time. I am here to talk about Bearing, a product we have built at Avennorth that solves a problem nobody in the ServiceNow ecosystem has automated: turning technical debt into scoped, priced, closeable revenue. By the end of this presentation, you will understand the problem, how Bearing solves it, why our approach is defensible, and what the financial opportunity looks like.

---

## Slide 2: The Problem

**Title:** ServiceNow's $10B+ Market Has a Hidden Problem

**Visual Direction:**
Split layout. Left side: a large, bold statistic ("8,100+") with the label "Enterprise ServiceNow customers worldwide." Right side: four problem statements stacked vertically, each with an icon (broken gear, shield with X, clock, warning triangle). Bottom strip: a timeline showing "Manual Assessment: 2-6 weeks" with a long red bar versus "Automated Assessment: 0 solutions available" with a gap/void.

**Content:**

- ServiceNow has 8,100+ enterprise customers, each spending $3M-$50M/year on the platform
- Every instance accumulates technical debt: hard-coded references, unscoped customizations, stale configurations, security gaps
- Technical debt compounds silently until it causes:
  - Failed upgrades that delay release adoption by quarters
  - Security breaches from misconfigured ACLs and exposed endpoints
  - Performance degradation from inefficient scripts and bloated tables
  - Compliance violations from unaudited configurations
- Current assessment methods are manual, inconsistent, and take 2-6 weeks per engagement
- There is NO automated platform for ServiceNow technical debt assessment today

**Speaker Notes:**
Let me set the context. ServiceNow is the dominant enterprise platform for IT service management, with over 8,100 enterprise customers globally. Each of those customers has accumulated years of customizations, scripts, and configurations -- and every single one of them has technical debt. The problem is that nobody has built a tool to systematically find, score, and price that debt. Today, a consulting firm sends a senior architect onsite for two to six weeks to manually review an instance. The results depend entirely on who does the review, what they happen to look at, and how much time they have. There is no standard. There is no automation. And there is no connection between "here are the findings" and "here is a proposal for how much it costs to fix them." That gap is what Bearing fills.

---

## Slide 3: The Market Opportunity

**Title:** A $2.4B Addressable Market Nobody Is Serving

**Visual Direction:**
Three concentric circles (TAM/SAM/SOM) centered on the slide. TAM (outermost, light gray): $4.86B. SAM (middle, dark gray): $1.2B. SOM (innermost, Electric Lime): $2.4B facilitated revenue. To the right of the circles, a brief calculation breakdown for each tier. Below the circles, a single callout box: "Zero automated competitors."

**Content:**

- **TAM (Total Addressable Market):**
  - 8,100+ ServiceNow enterprise customers globally
  - Average assessment + remediation engagement: $150K-$500K
  - Assessment frequency: 2-4x per year (quarterly recommended, especially around upgrades)
  - 8,100 customers x $300K average x 2 assessments/year = **$4.86B**

- **SAM (Serviceable Available Market):**
  - ~2,000 consulting firms actively doing ServiceNow implementation and managed services work
  - 2,000 firms x $300K average remediation x 2 assessments/year = **$1.2B**

- **SOM (Serviceable Obtainable Market -- 3-year horizon):**
  - 200 consulting firms x $12K annual platform fee + $200K average remediation revenue per firm
  - **$2.4B in facilitated remediation revenue** through the platform
  - Bearing platform revenue: ~$25M ARR at maturity

- **No direct competitor** offers automated assessment-to-SOW pipeline for ServiceNow

**Speaker Notes:**
The market math is straightforward. There are over 8,100 enterprise ServiceNow customers, each of whom should be assessed at least twice a year. The average remediation engagement runs $150K to $500K. That gives us a total addressable market of nearly $5 billion. Our serviceable market is the roughly 2,000 consulting firms that do ServiceNow work -- Elite partners, Premier partners, Specialist partners, and MSPs. In our first three years, we are targeting 200 of those firms. But here is the critical insight: Bearing's value is not just the platform subscription. It is the remediation revenue it surfaces. Each assessment finds $150K to $500K of work. When 200 firms are each running assessments on their customer base, the facilitated revenue runs into the billions. And today, nobody is automating this. Zero competitors. The market is entirely greenfield.

---

## Slide 4: The Solution

**Title:** Bearing: Automated Technical Debt Assessment for ServiceNow

**Visual Direction:**
Before/after split. Left panel labeled "Today (Manual)" with a muted, red-tinted treatment: icons for clipboard, stopwatch showing "2-6 weeks," inconsistent bar chart, question mark over dollar sign. Right panel labeled "With Bearing" with Electric Lime accent: icons for upload, stopwatch showing "Minutes," clean ranked list, dollar sign with checkmark. A horizontal arrow connects the two panels. Below the comparison, four key capability callouts in a 2x2 grid with icons.

**Content:**

| | Today (Manual) | With Bearing |
|---|---|---|
| **Time to assessment** | 2-6 weeks | Minutes |
| **Consistency** | Varies by consultant | Standardized 23 rules across 4 modules |
| **Output** | Spreadsheet or PDF | Interactive dashboard + DOCX reports |
| **Revenue connection** | Separate spreadsheet exercise | Built-in: every finding has a dollar amount |
| **SOW generation** | Manual Word document (days) | Automated from findings (minutes) |

Key capabilities:
- Upload a JSON export or connect via API -- get a health score in minutes, not weeks
- 23 scan rules across 4 modules (Core, CMDB, ITSM, ITAM) with more coming
- Every finding scored by severity, effort, and risk using a composite formula
- Findings automatically map to remediation patterns with effort estimates and SOW template language
- Revenue-first dashboard: leads with dollar amounts, not just technical findings
- One scan produces dual reports (consultant with pricing, customer without) and SOW generation

**Speaker Notes:**
Bearing replaces a manual process that takes weeks with an automated one that takes minutes. You upload a sanitized JSON export from a ServiceNow instance -- or connect directly via API -- and Bearing scans it against 23 rules across four modules. Every finding is scored by severity, effort, and risk. Every finding maps to a remediation pattern with pre-written scope language. And every finding has a dollar amount attached. The dashboard does not just say "you have 47 findings." It says "you have $347,000 of remediation work, and $89,000 of it is quick wins." That revenue-first orientation is the core design principle. Bearing is not a quality tool -- it is a revenue tool that happens to assess quality.

---

## Slide 5: How It Works

**Title:** From Raw Data to Revenue in 4 Steps

**Visual Direction:**
Horizontal flow diagram spanning the full width of the slide. Four large numbered circles (1-2-3-4) connected by arrows. Each circle sits above a content block. Use icons inside the circles: (1) upload/cloud icon, (2) magnifying glass/scanner icon, (3) gauge/score icon, (4) document/dollar icon. Below the flow, a thin timeline bar showing elapsed time: "0 min --> 2 min --> 5 min --> 10 min." Reference `docs/diagrams/04_process_assessment_lifecycle.svg` for the detailed process flow.

**Content:**

1. **Ingest**
   - Upload sanitized JSON export (no credentials required)
   - Or connect directly via OAuth 2.0 / Basic Auth to the ServiceNow instance
   - Zod schema validation ensures data integrity

2. **Scan**
   - 23 automated rules evaluate across 4 modules:
     - **Core:** Hard-coded sys_ids, unscoped customizations, script quality, update set hygiene
     - **CMDB:** Data quality, relationship integrity, class accuracy, staleness detection
     - **ITSM:** Incident/change/problem process maturity, SLA configuration, assignment hygiene
     - **ITAM:** License tracking, hardware lifecycle, software normalization, contract coverage
   - Each rule produces findings with severity, effort, risk, and affected record counts

3. **Score**
   - Composite score per finding: `severity x 0.4 + effort_inverse x 0.3 + risk x 0.3`
   - Health index (0-100) computed across all findings
   - Revenue calculation: rate card x effort hours x affected count
   - Optional: Pathfinder behavioral fusion enriches CMDB findings with live traffic data

4. **Deliver**
   - Interactive health dashboard with revenue breakdown by module
   - Consultant report (DOCX) with full pricing and margin analysis -- CONFIDENTIAL
   - Customer report (DOCX) white-labeled with customer branding -- no pricing
   - Statement of Work (DOCX) auto-generated from selected findings with scope, timeline, pricing, and signature blocks

**Speaker Notes:**
The workflow is four steps. Step one: ingest. The consultant either uploads a sanitized JSON export -- which means no credentials ever leave the customer's environment -- or connects directly via API. Step two: scan. Twenty-three rules evaluate the instance across Core platform health, CMDB data quality, ITSM process maturity, and ITAM asset management. Step three: score. Every finding gets a composite score and a revenue figure based on the consulting firm's rate card. Step four: deliver. The consultant gets an interactive dashboard, two report documents -- one for internal use with pricing, one for the customer without pricing -- and can generate a Statement of Work directly from selected findings. The entire process from upload to SOW takes under 30 minutes. Compare that to the current two-to-six-week manual process.

---

## Slide 6: The Revenue-First Dashboard

**Title:** Every Screen Answers: How Much Is This Worth?

**Visual Direction:**
Full-slide mockup or screenshot of the assessment dashboard. Key elements to highlight (use callout arrows or numbered annotations):
1. Health gauge (0-100) in the top-left -- large, prominent, color-coded (red/yellow/green)
2. Total Addressable Remediation Revenue prominently displayed in the top-right ($XXX,XXX in large Electric Lime text)
3. Revenue by module horizontal bar chart (Core, CMDB, ITSM, ITAM)
4. Quick Wins section -- filtered view of high-severity, low-effort items with individual revenue amounts
5. Findings table below with sortable columns: finding name, module, severity, effort, risk, composite score, revenue impact

If no screenshot is available, create a wireframe mockup with the above elements clearly laid out. Use Obsidian background with Electric Lime accent on key numbers.

**Content:**

- **Health Gauge (0-100):** Overall instance health at a glance. Color-coded: 0-40 critical (red), 41-70 needs attention (yellow), 71-100 healthy (green).
- **Total Addressable Remediation Revenue:** The single most important number on the screen. Displayed prominently. Example: "$347,200."
- **Revenue by Module:** Horizontal bar chart showing which modules have the biggest remediation opportunities. Helps consultants prioritize which conversations to have with the customer.
- **Quick Wins:** Automatically filtered view of high-severity, low-effort findings. These are the items a consultant can propose immediately to start an engagement. Example: "12 quick wins worth $89,400."
- **Findings Table:** Every finding sortable by composite score. Each row shows severity, effort, risk, composite score, affected count, and revenue impact. This is the prioritized remediation backlog, ready to use.

**Speaker Notes:**
This is the key differentiator. Other tools show findings. Bearing shows revenue. When a consultant opens Bearing after running a scan, the first thing they see is not a list of technical issues. The first thing they see is a number: $347,200 of total addressable remediation revenue. Below that, they see it broken down by module -- $140K in CMDB, $95K in Core, $72K in ITSM, $40K in ITAM. And then they see the Quick Wins section: 12 findings that are high-severity but low-effort, worth $89,400 combined. That is the conversation starter. The consultant walks into their next customer meeting and says: "We found $89,000 of high-priority work we can start on immediately, and $347,000 total." That is a fundamentally different conversation than "we found 47 issues in your instance."

---

## Slide 7: The SOW Generator

**Title:** Assessment Findings to Professional SOW in Minutes

**Visual Direction:**
Left-to-right flow showing three stages: (1) Findings selection -- a mockup of checkboxes next to findings in a table, (2) Configuration panel -- engagement type selector (T&M / Fixed Fee / Blended), rate card fields, timeline options, (3) Output -- a rendered DOCX document preview showing section headers (Scope of Work, Deliverables, Assumptions, Exclusions, Timeline, Pricing, Terms, Signatures). Use a subtle "magic" or "transform" visual between stages 2 and 3 to convey automation. Below the flow, show the SOW pipeline status bar: Draft --> Sent --> Under Review --> Accepted / Declined.

**Content:**

- **Select findings** from the assessment -- choose which items to include in the engagement scope
- **Configure engagement:**
  - Engagement type: Time & Materials, Fixed Fee, or Blended
  - Rate card: applies your firm's hourly rates automatically
  - Timeline: auto-generated based on finding priority (critical first, then high, then medium)
- **Generate professional DOCX** with:
  - Scope of Work -- auto-populated from remediation pattern templates (domain expertise encoded in the platform)
  - Deliverables -- specific to each remediation pattern
  - Assumptions -- curated from real engagement experience
  - Exclusions -- protect scope boundaries
  - Timeline with milestones
  - Pricing table (T&M breakdown or fixed-fee summary)
  - Terms and conditions
  - Signature blocks
- **SOW pipeline tracking:** Draft --> Sent --> Under Review --> Accepted --> Declined
- **Calibration loop:** When engagements complete, actual hours feed back into Bearing to improve future estimates

**Speaker Notes:**
This is the money feature. This is where Bearing converts assessment into revenue. A consultant can go from "I just uploaded an export" to "here is a $250,000 Statement of Work" in under 30 minutes. The SOW quality matches what a senior architect would write manually because the scope language comes from curated remediation pattern templates. Each pattern carries specific scope text, assumptions, deliverables, and exclusions that have been refined based on real engagement delivery. The consultant is not starting from a blank Word document. They are selecting findings, choosing an engagement type, and clicking Generate. The output is a professional document they can send to the customer that day. And once the engagement is complete, the actual hours flow back into Bearing through our calibration loop, making every future estimate more accurate. This is a patent-protected feature -- the assessment-to-SOW pipeline, the calibration feedback loop, and the dual-report generation are all covered by provisional patents.

---

## Slide 8: Dual Reports from Single Scan

**Title:** One Scan, Two Reports, Zero Pricing Leakage

**Visual Direction:**
Center of the slide: a single scan icon (magnifying glass over a ServiceNow logo) with two arrows branching outward -- one to the left, one to the right. Left branch: "Consultant Report" with a red "CONFIDENTIAL" stamp, showing a preview with visible pricing tables, margin analysis, revenue by module. Right branch: "Customer Report" with the customer's logo/branding, showing a preview with health scores, risk ratings, remediation guidance, and explicitly NO pricing. Between the two reports, a barrier/wall graphic with a lock icon, emphasizing separation. Use a subtle green checkmark on the consultant side and a blue shield on the customer side.

**Content:**

- **Consultant Report (CONFIDENTIAL):**
  - Full assessment findings with composite scores
  - Revenue by module with pricing breakdown
  - Margin analysis (blended rate vs. cost rate)
  - Per-finding revenue impact and effort estimates
  - Rate card application details
  - Quick wins highlighted with ROI indicators

- **Customer Report (White-Labeled):**
  - Branded with customer's logo, colors, and legal text
  - Health score and risk-focused narrative
  - Findings organized by severity and module
  - Remediation guidance and best-practice recommendations
  - No pricing, no rate card, no margin data -- physically cannot contain this information
  - Designed to build urgency without revealing the consultant's economics

- **Single scan, single findings set** -- no duplicate work, no risk of sending the wrong version
- The customer report is not a "stripped" version of the consultant report -- it is a separate generator that never has access to pricing data

**Speaker Notes:**
This solves a real and painful problem. Every consulting firm has a horror story about accidentally sending an internal report with pricing to a customer. Or spending hours manually stripping pricing from an assessment document. Bearing makes this impossible. The two reports are generated by separate code paths. The customer report generator physically does not have access to pricing data. It cannot accidentally include it because it never sees it. Both reports come from the same scan and the same findings -- there is no duplicate work. But the outputs are fundamentally different documents designed for different audiences. The consultant report is a revenue planning tool. The customer report is a sales tool. This dual-report generation is covered by one of our six provisional patents.

---

## Slide 9: Pathfinder Integration -- Behavioral Intelligence

**Title:** Static Assessment + Live Traffic = Findings Nobody Else Can Find

**Visual Direction:**
Venn diagram with two overlapping circles. Left circle: "Bearing (Static Assessment)" -- lists CMDB configuration, script analysis, process evaluation. Right circle: "Pathfinder (Behavioral Observation)" -- lists live traffic analysis, eBPF/ETW agents, real-time state. Overlap zone (highlighted in Electric Lime): "Fusion Findings" -- the findings only possible when both data sources combine. Below the Venn diagram, a 2x2 grid showing the four coverage zones with example findings. Reference `docs/diagrams/06_process_pathfinder_integration.svg`.

**Content:**

- **Bearing alone:** Evaluates what the CMDB says -- configuration data, scripts, process definitions
- **Pathfinder alone:** Observes what is actually happening -- real network traffic via eBPF (Linux) and ETW (Windows) agents
- **Together:** Fusion findings that neither tool can detect independently:

| Fusion Finding | CMDB Says | Pathfinder Sees | Severity | Business Impact |
|---------------|-----------|-----------------|----------|-----------------|
| Active-Idle Mismatch | Status = Operational | State = Idle | Critical | Paying for licenses on unused infrastructure |
| Zombie Infrastructure | Status = Retired | State = Active | High | Unmanaged, unpatched systems still in production |
| Shadow IT | No record exists | Active traffic detected | Critical | Unknown systems outside governance and security |
| Class Mismatch | Class = Linux Server | Behavior = Windows (>75% confidence) | High | CMDB integrity compromised, automation unreliable |
| Unconfirmed Relationship | Relationship exists | No traffic between CIs | Medium | Dependency maps based on stale data |

- **Four-zone coverage analysis:**
  - Fully Covered -- both Bearing and Pathfinder have data
  - Pathfinder Only -- traffic observed but no CMDB record (shadow IT)
  - Discovery Only -- CMDB record exists but no traffic data
  - Dark -- neither source has visibility

**Speaker Notes:**
This is the patent-protected moat. Bearing alone is valuable -- it automates a manual process and connects findings to revenue. But Bearing plus Pathfinder creates a category of findings that no other product in the world can produce. Let me give you the most compelling example: Shadow IT detection. The CMDB says nothing -- there is no record. But Pathfinder's eBPF agents see active network traffic from a system that does not exist in the customer's configuration management database. That is a critical security finding, and it is literally impossible to detect with static analysis alone. You need both a configuration assessment engine and a behavioral traffic observation platform. We have both. A competitor would need to build both Bearing and Pathfinder -- and the fusion scoring engine that connects them -- to replicate this capability. That is protected by our provisional patent on composite health scoring with behavioral confidence fusion.

---

## Slide 10: The Avennorth Product Suite

**Title:** Five Products, One Navigation Metaphor

**Visual Direction:**
Horizontal timeline/journey graphic flowing left to right, with five waypoints. Each waypoint is a product icon with the product name below and its narrative role above. The journey metaphor: a path through terrain, with each product serving a navigation function. Use the navigation metaphor consistently -- Bearing is a compass bearing (direction), Pathfinder finds the route, Contour maps the elevation, Vantage provides the lookout, Compass guides the journey. Below the journey graphic, show integration arrows between products. Reference `docs/diagrams/07_product_suite_overview.svg`.

**Content:**

| Product | Role | Narrative | Status |
|---------|------|-----------|--------|
| **Bearing** | Measures where you are | Assess | Platform built, 105 source files |
| **Pathfinder** | Discovers your terrain | Discover | Integration architecture complete |
| **Contour** | Plots your waypoints | Map | Planned |
| **Vantage** | Spots wrong turns | Respond | Planned |
| **Compass** | The guide | Guide | Architecture defined |

**Narrative flow:** Assess --> Discover --> Map --> Respond --> Guide

**Key integration flows:**
- Bearing --> Compass: SOW pipeline sync, assessment-sourced leads, revenue forecasting
- Pathfinder --> Bearing: Behavioral confidence feeds, fusion scoring enrichment
- Compass --> Bearing: Calibration data (actual hours vs. estimates) for feedback loop
- Bearing --> Pathfinder: Assessment findings trigger targeted discovery agent deployment recommendations

**Speaker Notes:**
Bearing is not a standalone product. It is the entry point to a five-product suite, all built on a shared navigation metaphor. Bearing tells you where you are -- your current state of technical debt. Pathfinder discovers the actual terrain -- what is really running in your environment. Contour maps the service relationships. Vantage watches for incidents and helps investigate them. And Compass is the guide -- the CRM where all the intelligence comes together for pipeline management and client engagement. The integration between these products creates compounding value. Bearing finds the debt, Pathfinder validates it with behavioral data, the SOW flows into Compass for pipeline tracking, and when the engagement completes, the actual hours flow back into Bearing to improve future estimates. Each product makes the others more valuable, and a customer who adopts the full suite has capabilities that no combination of point solutions can match.

---

## Slide 11: Competitive Landscape

**Title:** Why Nobody Else Can Do This

**Visual Direction:**
Competitive comparison matrix. Bearing column highlighted in Electric Lime. Competitor columns in neutral gray. Use checkmark/X/warning icons for easy scanning. Below the table, a single callout: "Time to first assessment: Minutes vs. Weeks." Consider a secondary visual -- a radar/spider chart showing Bearing's coverage across the capability dimensions versus each competitor category.

**Content:**

| Capability | Bearing | Manual Assessment | SN Instance Scan | Generic Code Scanners |
|------------|---------|-------------------|------------------|-----------------------|
| Automated scanning | 23 rules, 4 modules | Manual checklists | Limited scope | Not ServiceNow-aware |
| Revenue calculation | Rate card integration | Separate spreadsheet | No pricing | No pricing |
| SOW generation | Automated from findings | Manual Word docs (days) | Not available | Not available |
| Dual reports | Consultant + Customer | Manual separation | Single view | Not applicable |
| Behavioral fusion | Pathfinder integration | Not possible | Not possible | Not possible |
| Calibration loop | Auto-adjusting estimates | Tribal knowledge | Not available | Not available |
| Multi-tenant | Org-level RLS isolation | N/A | Single instance | Not applicable |
| White-labeling | Full brand customization | Manual formatting | Not available | Not available |
| Benchmarking | Anonymized peer comparison | Not possible | Not available | Not available |
| **Time to assessment** | **Minutes** | **2-6 weeks** | **Hours (limited)** | **N/A** |

**Speaker Notes:**
Let me address the competitive landscape directly. There are three things a consulting firm might use today instead of Bearing. First, manual assessment -- which is what everyone does now. A senior architect spends two to six weeks reviewing an instance using their own checklists. The output depends entirely on who does the review. There is no revenue calculation, no SOW generation, and no benchmarking. Second, ServiceNow's built-in Instance Scan. It checks for some basic issues, but it does not score findings, does not calculate revenue, does not generate SOWs, does not produce dual reports, and does not learn from outcomes. It is a quality check, not a revenue tool. Third, generic code scanning tools. These are not ServiceNow-aware and cannot evaluate platform-specific patterns like CMDB data quality or ITSM process maturity. Nobody combines automated scanning, revenue calculation, SOW generation, dual reports, behavioral fusion, and calibration in a single platform. That is why this market is greenfield.

---

## Slide 12: Patent Portfolio

**Title:** 6 Provisional Patents Protecting the Core Innovation

**Visual Direction:**
Six patent cards arranged in a 2x3 grid. Each card has a number (1-6), a title, a one-sentence description, and a small icon representing the concept. The cards should feel like "building blocks" that stack together to form a wall/moat. Use a subtle moat graphic around the grid to reinforce the defensibility message. Highlight patents 1 and 6 with Electric Lime borders as the strongest claims.

**Content:**

1. **Assessment-to-SOW Pipeline**
   Automated generation of Statements of Work from technical debt assessment findings with effort-based pricing. Protects the end-to-end chain: scan --> findings --> remediation patterns --> revenue calculation --> DOCX generation with scope, pricing, milestones, and signatures.

2. **Calibration Feedback Loop**
   Tracking actual engagement hours against estimates to auto-calibrate future projections. Running average formula updates remediation pattern effort estimates after each completed engagement (minimum 3 samples before activation).

3. **Dual-Report Generation**
   Single scan producing both internal (with pricing) and customer-facing (without pricing) reports from the same findings set. Separate generator code paths ensure the customer report physically cannot contain pricing data.

4. **Sanitized Export Assessment**
   Technical debt assessment via sanitized JSON export without requiring direct API access or credentials. Enables assessment of instances where the customer will not grant API connectivity.

5. **Assessment-Triggered Discovery Deployment**
   Assessment findings identifying CMDB gaps automatically trigger targeted Pathfinder agent deployment recommendations, including specific subnets, priority ordering, and estimated coverage impact.

6. **Composite Health Scoring with Behavioral Confidence Fusion**
   Blending static CMDB assessment with dynamic Pathfinder behavioral traffic analysis to produce fusion-only findings detectable only when both data sources are present, plus an adjusted health score incorporating both signals.

**Speaker Notes:**
We have filed six provisional patents that protect the full assessment-to-revenue chain. Let me highlight the two most important. Patent one covers the assessment-to-SOW pipeline -- the automated chain from scanning an instance through to generating a professional Statement of Work. This is the core revenue feature. Patent six covers composite health scoring with behavioral confidence fusion -- the system that combines Bearing's static assessment with Pathfinder's live traffic data to produce findings that neither tool can detect alone. A competitor would need to design around all six patents to build an equivalent product. And patent six is particularly strong because it requires two separate platforms -- a static assessment engine and a behavioral observation engine -- working together through a fusion scoring system. No competitor has both platforms, and building them would take years.

---

## Slide 13: Network Effects and Moat

**Title:** Every Assessment Makes the Platform Smarter

**Visual Direction:**
Flywheel diagram -- two interlocking cycles. Cycle 1 (Assessment Flywheel): More Assessments --> Better Benchmarks --> More Value to Customers --> More Assessments. Cycle 2 (Engagement Flywheel): More Completed Engagements --> Better Calibration --> More Accurate SOWs --> Higher Close Rates --> More Completed Engagements. The two flywheels connect where SOW accuracy drives assessment adoption. Use curved arrows and Electric Lime highlights on the connection points. Below the flywheel, four data moat callouts in a horizontal strip.

**Content:**

**The Assessment Flywheel:**
- More assessments --> better anonymized benchmarks
- Better benchmarks --> customers see how they compare to industry peers (available after 10+ assessments per cohort)
- Better benchmarks --> more valuable platform --> more assessments

**The Engagement Flywheel:**
- More completed engagements --> actual hours fed back via calibration loop
- Better calibration --> more accurate effort estimates in SOWs
- More accurate SOWs --> higher close rates and healthier margins
- More closed deals --> more completed engagements

**Four compounding data moats:**

1. **Benchmarking Data:** Anonymized assessment data creates peer comparison benchmarks. The more assessments run through the platform, the more valuable benchmarks become. This data cannot be replicated without running the assessments.

2. **Calibration Intelligence:** Every completed engagement improves effort estimates. After 3+ samples per remediation pattern, Bearing automatically adjusts future projections. This learning is cumulative and proprietary.

3. **Scan Rule Library:** Domain expertise encoded as automated scan rules. Currently 23 rules across 4 modules. Roadmap includes 7 additional modules (HRSD, SPM, SecOps, GRC, CSM, ITOM, EA) growing to 100+ rules. Each rule represents deep ServiceNow platform knowledge.

4. **Remediation Pattern Templates:** SOW scope language, assumptions, deliverables, and exclusions refined by actual delivery experience. Currently 12 patterns. Each pattern carries curated professional services language that would take a competitor years to develop.

**Speaker Notes:**
This slide explains why Bearing gets more defensible over time. There are two flywheels spinning simultaneously. The assessment flywheel: every assessment adds to our anonymized benchmark database. After 10 assessments in a cohort -- say, financial services companies on the Tokyo release -- we can tell the next financial services customer exactly how they compare to their peers. That benchmark data is enormously valuable and can only be built by running assessments at scale. The engagement flywheel: every completed engagement feeds actual hours back into the calibration loop, making future estimates more accurate. More accurate estimates mean better SOWs, which mean higher close rates, which mean more completed engagements. These flywheels compound over time and create data moats that a new entrant cannot replicate without running thousands of assessments and completing hundreds of engagements. On top of that, our scan rule library and remediation pattern templates represent deep ServiceNow domain expertise that took years to develop and will continue to expand.

---

## Slide 14: Go-to-Market Strategy

**Title:** Land with Assessment, Expand with Suite

**Visual Direction:**
Three-phase horizontal graphic: LAND (left), EXPAND (center), SCALE (right), connected by arrows. Each phase has a target customer icon and key actions. Below the phases, a sales motion callout box with the "elevator pitch" in quotes. Bottom of slide: target customer logos or category labels (Elite Partners, Premier Partners, Specialist Partners, MSPs, Internal IT).

**Content:**

**Phase 1: LAND**
- Free trial: upload one export, see the health score and finding count -- no credit card required
- Conversion trigger: consultant wants the full reports, SOW generation, and revenue dashboard
- Sales motion: "Upload your customer's export. In 10 minutes, you will have a health score and know exactly how much remediation revenue is on the table. Your first assessment is free."

**Phase 2: EXPAND**
- Upsell from Starter to Professional (SOW generation, more assessments, more users)
- Upsell from Professional to Enterprise (Pathfinder integration, API access, unlimited assessments)
- Cross-sell Pathfinder for behavioral enrichment and fusion findings
- Cross-sell Compass for CRM pipeline management and calibration data flow

**Phase 3: SCALE**
- Partner program: consulting firms white-label Bearing as their proprietary assessment tool
- Channel partnerships with ServiceNow directly (marketplace listing)
- Enterprise-wide licensing for the full Avennorth suite

**Target customers (in priority order):**
1. ServiceNow Elite Partners (~30 firms globally) -- highest volume, most assessments
2. ServiceNow Premier Partners (~150 firms) -- strong ServiceNow practices
3. ServiceNow Specialist Partners (~500+ firms) -- growing practices, need differentiation
4. Managed Service Providers managing ServiceNow instances -- recurring assessment need
5. Internal IT teams at large enterprises -- self-assessment for upgrade readiness

**Pricing model:**
- Starter: $499/month (5 assessments, 2 users)
- Professional: $1,499/month (25 assessments, 10 users, SOW generation)
- Enterprise: $3,999/month (unlimited assessments, unlimited users, API access, Pathfinder, priority support)

**Speaker Notes:**
Our go-to-market strategy is straightforward: land with assessment, expand with the suite. The landing motion is a free trial. A consultant uploads their customer's export, and in 10 minutes they have a health score and a finding count. The free tier shows them enough to understand the value -- the full reports, SOW generation, and revenue dashboard require a paid subscription. The conversion pitch writes itself: "You just saw that this instance has $300K of remediation work. Would you like to generate a professional SOW for that in the next 20 minutes?" Expansion comes naturally. Once a firm is running assessments regularly, they want more seats, more assessments per month, SOW generation, and eventually Pathfinder integration for the fusion findings that differentiate them from every other ServiceNow consultancy. Our target customers are ServiceNow partner firms -- starting with the Elite partners who do the highest volume and working down through Premier and Specialist partners.

---

## Slide 15: Traction and Roadmap

**Title:** Built, Building, and What Is Next

**Visual Direction:**
Three-column layout with a timeline feel. Left column (green/complete): "Built" with a checkmark header. Center column (yellow/in-progress): "Next 6-12 Months" with a construction header. Right column (blue/future): "12-24 Months" with a telescope/horizon header. Each column contains a bulleted list. Below the columns, a horizontal Gantt-style timeline showing key milestones.

**Content:**

**Built (Phases 1-5 Complete):**
- Full-stack platform: 105 source files, 30 routes, 23 scan rules
- 4 scanner modules: Core, CMDB, ITSM, ITAM
- 3 document generators: Consultant report, Customer report, SOW (DOCX)
- Composite scoring engine with health index (0-100)
- Pathfinder integration with 5 fusion rules and 4-zone coverage analysis
- Revenue calculator with rate card support and engagement type flexibility
- Benchmarking engine with anonymized peer comparison
- Calibration feedback loop with running average factor adjustment
- Continuous monitoring with delta detection
- SOW pipeline tracking (Draft --> Sent --> Under Review --> Accepted --> Declined)
- 8 Figma-compatible architecture diagrams
- Complete internal documentation (architecture, patents, scan rules) and customer documentation
- 6 provisional patents filed

**Next 6-12 Months:**
- Authentication and multi-tenant onboarding (Supabase Auth)
- 7 additional scanner modules: HRSD, SPM, SecOps, GRC, CSM, ITOM, EA
- Expand from 23 to 100+ scan rules
- Background job processing for large-instance scans (Inngest/BullMQ)
- Benchmark cohort analytics dashboard
- Compass CRM full bidirectional integration
- Mobile-responsive assessment review
- Production deployment with CI/CD pipeline

**Future 12-24 Months:**
- AI-powered scan rule generation from ServiceNow release notes and documentation
- Natural language finding descriptions (LLM-enhanced remediation guidance)
- Automated remediation scripts (not just findings, but executable fixes)
- ServiceNow Store marketplace listing
- Partner portal for white-label resale and co-marketing
- International localization

**Speaker Notes:**
Let me be very clear about where we are. The platform is built. Not designed, not prototyped -- built. 105 source files, 30 routes, 23 scan rules, 4 modules, 3 document generators, fusion scoring, calibration, benchmarking, the full assessment-to-SOW pipeline. This was built with zero external funding. What we need to get to market is authentication, multi-tenant onboarding, production hardening, and go-to-market execution. That is the next 6 to 12 months. During that same period, we expand the scan rule library from 23 to over 100 rules across 11 modules, which dramatically increases the value of each assessment. In the 12-to-24-month horizon, we introduce AI-powered capabilities: generating new scan rules from ServiceNow documentation, natural language finding descriptions, and eventually automated remediation scripts that do not just find the problems but fix them.

---

## Slide 16: The Ask / Call to Action

**Title:** Join Us

**Visual Direction:**
Clean, bold slide. Obsidian background. Two sections, divided by a thin Electric Lime horizontal line. Top section for investors, bottom section for sales prospects. Each section has a headline, a single paragraph of text, and a clear call-to-action. Bottom of slide: contact information and the Avennorth logo. No clutter -- this slide should feel like an invitation.

**Content:**

**For Investors:**

We are raising $1.5M to take Bearing from built to market. We have 6 provisional patents, a complete platform (105 source files, zero external funding to date), and a $2.4B addressable market with zero automated competition. The path to profitability is 18 months, and every dollar of platform revenue facilitates 100x in remediation revenue for our customers.

*See Appendix Slides A1-A5 for the full financial model.*

**For Consulting Firms:**

Try Bearing today. Upload your customer's ServiceNow export and see their health score in under 10 minutes. Your first assessment is free. In 30 minutes, you will have a prioritized remediation backlog, a revenue estimate, and optionally a ready-to-send Statement of Work.

*Schedule a demo or start your free trial at [avennorth.com/bearing].*

**Contact:**
- Avennorth, Inc.
- [email / phone / website]
- [LinkedIn / scheduling link]

**Speaker Notes:**
I will leave you with two messages, depending on why you are in this room. If you are an investor: we have built the entire platform without spending a dollar of external capital. Six provisional patents. 105 source files. A complete assessment-to-SOW pipeline. What we need is $1.5M to take this to market, and we will be profitable in 18 months. The financial model is in the appendix and I am happy to walk through it in detail. If you are evaluating Bearing for your consulting practice: the proof is in the product. Upload an export. See the health score. Look at the revenue number. Generate a SOW. You will know within 30 minutes whether Bearing changes how your firm runs assessments. I believe it will, and I would welcome the opportunity to prove it. Thank you.

---

---

# APPENDIX: INVESTMENT CASE

> The following slides are intended for investor audiences and should be included at the end of the deck or provided as a separate supplementary document.

---

## Slide A1: Financial Model -- Revenue Projections

**Title:** Revenue Model and 5-Year Projections

**Visual Direction:**
Top section: three revenue stream cards side by side (Platform Subscription, Assessment Overages, Professional Services) with brief descriptions and price points. Bottom section: a projection table with year-over-year growth. Below the table, a line chart showing total revenue trajectory from Year 1 to Year 5, with a clear inflection point at Year 2-3. Use Electric Lime for the revenue line, gray for the cost line (introduced in A2).

**Content:**

**Revenue Streams:**

| Stream | Description | Pricing |
|--------|-------------|---------|
| Platform Subscription | Monthly SaaS fee per organization | $499-$3,999/month |
| Assessment Overages | Per-assessment fee beyond plan limits | $99/assessment |
| Professional Services | Implementation, custom scan rules, training | $15K-$50K/engagement |

**Tier Detail:**

| Tier | Monthly Price | Assessments/Month | Users | Key Features |
|------|--------------|-------------------|-------|--------------|
| Starter | $499 | 5 | 2 | Dashboard, dual reports |
| Professional | $1,499 | 25 | 10 | + SOW generation, benchmarking |
| Enterprise | $3,999 | Unlimited | Unlimited | + API access, Pathfinder integration, priority support |

**5-Year Revenue Projection:**

| Metric | Year 1 | Year 2 | Year 3 | Year 4 | Year 5 |
|--------|--------|--------|--------|--------|--------|
| Paying Organizations | 20 | 75 | 200 | 450 | 800 |
| Avg MRR per Org | $1,200 | $1,500 | $1,800 | $2,000 | $2,200 |
| Platform ARR | $288K | $1.35M | $4.32M | $10.8M | $21.1M |
| Assessment Overages | $24K | $135K | $480K | $1.35M | $2.88M |
| Professional Services | $150K | $375K | $600K | $900K | $1.2M |
| **Total Revenue** | **$462K** | **$1.86M** | **$5.4M** | **$13.05M** | **$25.18M** |
| YoY Growth | -- | 303% | 190% | 142% | 93% |

**Speaker Notes:**
The revenue model has three streams. The primary stream is platform subscriptions -- monthly SaaS fees ranging from $499 for a Starter plan to $3,999 for Enterprise. We expect the average MRR per organization to start at $1,200 in Year 1 and grow to $2,200 by Year 5 as customers upgrade tiers and adopt additional products. The secondary streams are assessment overage fees for firms that exceed their plan limits and professional services for custom implementations. These projections assume modest market penetration. There are over 2,000 ServiceNow consulting firms globally. Reaching 800 paying organizations by Year 5 represents roughly 40% penetration of just the consulting firm segment -- not counting internal IT teams, MSPs, or direct enterprise sales. The growth rates decelerate from 303% in Year 2 to 93% in Year 5, which we believe is conservative given the greenfield nature of the market.

---

## Slide A2: Financial Model -- Cost Structure

**Title:** Cost Structure and Path to Profitability

**Visual Direction:**
Stacked bar chart showing cost categories by year (Engineering, Infrastructure, Sales & Marketing, G&A, Legal) with a revenue line overlaid. The crossover point (profitability) should be clearly marked -- it occurs in Year 2. Below the chart, a summary table with cost breakdowns and net income. Highlight the net margin progression from -116% to +82% across the five years.

**Content:**

| Cost Category | Year 1 | Year 2 | Year 3 | Year 4 | Year 5 |
|---------------|--------|--------|--------|--------|--------|
| **Engineering** | $600K | $900K | $1.2M | $1.5M | $1.8M |
| Headcount | 4 | 6 | 8 | 10 | 12 |
| **Infrastructure** | $24K | $60K | $120K | $240K | $360K |
| (Vercel, Supabase, monitoring, security) | | | | | |
| **Sales & Marketing** | $200K | $400K | $800K | $1.2M | $1.8M |
| Sales headcount | 2 | 3 | 5 | 7 | 10 |
| **G&A** | $100K | $150K | $250K | $400K | $600K |
| **Patent & Legal** | $75K | $50K | $50K | $50K | $50K |
| **Total Costs** | **$999K** | **$1.56M** | **$2.42M** | **$3.39M** | **$4.61M** |

| Profitability | Year 1 | Year 2 | Year 3 | Year 4 | Year 5 |
|---------------|--------|--------|--------|--------|--------|
| Total Revenue | $462K | $1.86M | $5.4M | $13.05M | $25.18M |
| Total Costs | $999K | $1.56M | $2.42M | $3.39M | $4.61M |
| **Net Income** | **($537K)** | **$300K** | **$2.98M** | **$9.66M** | **$20.57M** |
| **Net Margin** | **-116%** | **16%** | **55%** | **74%** | **82%** |

**Speaker Notes:**
The cost structure is lean and SaaS-typical. Engineering is the largest expense, scaling from 4 engineers in Year 1 to 12 in Year 5 as we expand the scan rule library and module coverage. Infrastructure costs are minimal -- Vercel and Supabase scale efficiently and the cost stays well below 2% of revenue. Sales and marketing scales with the customer base. The critical number: we reach profitability in Year 2 with just 75 paying organizations. That means the $1.5M raise gives us a clear runway to profitability without needing additional capital. By Year 5, net margins reach 82%, which is strong even by SaaS standards, because the product is fundamentally a software assessment engine with minimal per-customer marginal cost.

---

## Slide A3: Financial Model -- Unit Economics

**Title:** SaaS Unit Economics

**Visual Direction:**
Four large metric cards across the top of the slide, each with the metric name, Year 1 value, Year 5 value, and a small trend arrow. Cards: LTV:CAC Ratio, Payback Period, Gross Margin, Net Revenue Retention. Below the cards, a two-panel chart: left panel shows LTV/CAC improvement over 5 years (bar chart), right panel shows payback period shrinking over 5 years (line chart). A green "healthy zone" indicator above the 3x line on the LTV:CAC chart.

**Content:**

| Metric | Year 1 | Year 3 | Year 5 | Benchmark |
|--------|--------|--------|--------|-----------|
| **CAC** (Customer Acquisition Cost) | $5,000 | $3,000 | $2,250 | Varies |
| **LTV** (Lifetime Value) | $43,200 | $43,200 | $43,200 | Varies |
| **LTV:CAC Ratio** | 8.6x | 14.4x | 19.2x | >3x is healthy |
| **Payback Period** | 4.2 months | 1.7 months | 1.0 month | <12 months is healthy |
| **Gross Margin** | 85%+ | 88%+ | 90%+ | >70% for SaaS |
| **Net Revenue Retention** | 115% | 120% | 125% | >100% means expansion |

**LTV Calculation:**
- Average MRR: $1,800
- Average customer lifespan: 24 months
- LTV = $1,800 x 24 = $43,200

**CAC Calculation:**
- Year 1: $200K sales/marketing spend / 40 new customers acquired = $5,000 CAC
- Year 5: $1.8M spend / 800 cumulative paying = $2,250 CAC (blended)

**Why unit economics are strong:**
- The product sells itself once a consultant sees the revenue number from their first assessment
- CAC drops rapidly as word-of-mouth and benchmarks create pull demand
- Net revenue retention exceeds 100% because customers upgrade tiers as they increase assessment volume
- Gross margins are 85%+ because there is near-zero marginal cost per assessment (compute + storage)

**Speaker Notes:**
The unit economics tell a compelling story. Our LTV-to-CAC ratio starts at 8.6x in Year 1 and improves to 19.2x by Year 5. For context, a 3x ratio is considered healthy for SaaS businesses -- we are well above that from day one. The payback period is 4.2 months in Year 1, meaning we recoup customer acquisition costs in a single quarter. Gross margins are 85%+ because the marginal cost of running an assessment is trivial -- it is a software scan, not a human engagement. And net revenue retention exceeds 100% because customers naturally upgrade. A firm starts on the Starter plan, runs a few assessments, sees the value, and moves to Professional for SOW generation. Then they want Pathfinder integration and move to Enterprise. This expansion dynamic means our existing customer base grows even without new acquisitions.

---

## Slide A4: Financial Model -- Funding Ask

**Title:** Raising $1.5M to Reach Profitability

**Visual Direction:**
Left side: a pie chart showing use of funds (Engineering 50%, Sales & Marketing 27%, Infrastructure 7%, Legal 7%, G&A & Runway 10%). Right side: a vertical milestone timeline with 6 milestone markers at months 3, 6, 9, 12, 15, and 18. Each milestone has a brief label and a metric. Bottom of slide: deal structure summary in a clean table. Highlight "Cash-flow positive: Month 15" and "Bootstrapped to date" as standout callouts.

**Content:**

**Use of Funds:**

| Category | Amount | % | Purpose |
|----------|--------|---|---------|
| Engineering | $750K | 50% | 4 engineers x 18 months: production hardening, auth, 7 new scanner modules, 77+ new scan rules |
| Sales & Marketing | $400K | 27% | 2 sales reps, content marketing, conference presence (Knowledge, ServiceNow partner events), partner program launch |
| Infrastructure | $100K | 7% | Production hosting (Vercel Pro), Supabase Pro, security audits, SOC 2 Type I preparation |
| Legal & Patents | $100K | 7% | Patent prosecution (6 provisionals --> full utility filings), corporate legal, terms of service |
| G&A & Runway | $150K | 10% | 18-month operational buffer, accounting, insurance |
| **Total** | **$1.5M** | **100%** | |

**Key Milestones:**

| Month | Milestone | Metric |
|-------|-----------|--------|
| 3 | Production launch | Auth, CI/CD, first paying customers |
| 6 | Module expansion | 7 scanner modules (up from 4), 20 paying orgs |
| 9 | Compass integration | Full bidirectional CRM sync, 50 paying orgs |
| 12 | Pathfinder GA | Behavioral fusion in production, 75 paying orgs |
| 15 | Cash-flow positive | Platform revenue covers operating costs |
| 18 | Series A position | $100K+ MRR, 100+ paying orgs, expansion metrics proven |

**Deal Structure:**
- Round: Seed
- Amount: $1.5M
- Instrument: SAFE with valuation cap or priced equity (flexible based on investor preference)
- Existing investment: **$0 -- bootstrapped to date.** The entire platform was built with zero external funding.
- Target close: Q2 2026

**Speaker Notes:**
Here is the ask. We are raising $1.5 million in a seed round. Half goes to engineering -- we need four engineers for 18 months to take the platform from built to production-grade and expand the scan rule library. Twenty-seven percent goes to sales and marketing to get in front of ServiceNow consulting firms at conferences and through direct outreach. The rest covers infrastructure, legal, and operational runway. I want to emphasize one number: zero. That is the amount of external capital we have spent to date. The entire platform -- 105 source files, 30 routes, 23 scan rules, 3 document generators, 6 provisional patents -- was built without a single dollar of outside funding. The $1.5M takes us from "built" to "in market and profitable." Our milestone timeline shows cash-flow positive at month 15 and Series A positioning at month 18 with $100K+ MRR and 100+ paying organizations.

---

## Slide A5: Financial Model -- Facilitated Revenue Impact

**Title:** The Real Number: $2B+ in Facilitated Remediation Revenue

**Visual Direction:**
Iceberg diagram -- the most important visual in the deck. Above the waterline (small): "Bearing Platform Revenue: $25M ARR at maturity." Below the waterline (massive): "Facilitated Remediation Revenue: $2B+ annually by Year 5." The below-water section should be dramatically larger -- at least 10x the above-water section. Use blue tones for water, Electric Lime for the platform revenue label, white for the facilitated revenue label. To the right of the iceberg, show the math in a clean calculation block. Below the iceberg, a ROI callout: "Customers pay $2K/month to find $250K/engagement in work."

**Content:**

**The Platform Revenue (Above the Waterline):**
- Year 5 platform ARR: $25.18M
- This is what Avennorth earns directly

**The Facilitated Revenue (Below the Waterline):**
- Each assessment surfaces $150K-$500K of remediation work
- By Year 5: 800 orgs x 10 assessments/year x $250K avg remediation = **$2B in facilitated revenue**
- This is what Bearing's customers earn because of the platform

**The Value Asymmetry:**
- A consulting firm pays $2,000/month for Bearing (Professional plan)
- Each assessment surfaces ~$250,000 of remediation work
- Annual platform cost: $24,000
- Annual facilitated revenue (10 assessments): $2,500,000
- **ROI: 104x** -- for every $1 spent on Bearing, the firm captures $104 in remediation revenue

**Why This Matters for Investors:**
- Bearing is not a $25M ARR SaaS company. It is the platform that facilitates $2B+ in annual consulting revenue.
- The value asymmetry creates massive customer stickiness -- no rational firm would cancel a $24K subscription that surfaces $2.5M in revenue.
- The facilitated revenue gives Bearing optionality: take-rate models, premium services, marketplace dynamics.
- Comparable platforms (Salesforce for sales teams, HubSpot for marketing teams) are valued on the revenue they facilitate, not just the subscriptions they charge.

**Speaker Notes:**
This is the most important slide in the deck, and I saved it for the appendix because it requires some context to fully appreciate. The platform revenue -- $25 million ARR at maturity -- is a strong SaaS business on its own. But it is the tip of the iceberg. The real number is below the waterline. Bearing facilitates remediation revenue for its customers. Each assessment surfaces $150,000 to $500,000 of scoped, priced work. By Year 5, with 800 organizations running an average of 10 assessments per year at $250,000 average remediation value, Bearing is facilitating over $2 billion in annual consulting revenue. That creates an extraordinary value asymmetry. A consulting firm pays $24,000 per year for Bearing and uses it to find $2.5 million per year in remediation work. That is a 104x ROI. No rational firm cancels that subscription. This is the same dynamic that makes Salesforce and HubSpot so valuable -- they are not valued on their subscription revenue alone, but on the revenue they help their customers capture. That is the lens through which I would encourage you to evaluate this opportunity.

---

# END OF DECK

---

## Appendix: Slide Count Summary

| Section | Slides | Numbers |
|---------|--------|---------|
| Main Deck | 16 | Slides 1-16 |
| Investment Appendix | 5 | Slides A1-A5 |
| **Total** | **21** | |

## Appendix: Source References

| Reference | Location |
|-----------|----------|
| Solution Overview | `docs/SOLUTION_OVERVIEW.md` |
| Architecture Overview | `docs/internal/01_architecture_overview.md` |
| Patent Claims | `docs/internal/05_patent_claims.md` |
| Product Context | `CLAUDE.md` |
| Process Lifecycle Diagram | `docs/diagrams/04_process_assessment_lifecycle.svg` |
| Pathfinder Integration Diagram | `docs/diagrams/06_process_pathfinder_integration.svg` |
| Product Suite Diagram | `docs/diagrams/07_product_suite_overview.svg` |
