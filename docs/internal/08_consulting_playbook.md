# Consulting Playbook: Bearing in Customer Engagements

**Internal CoreX Consulting Reference**
Last updated: 2026-04-01 | Version: 0.1.0

---

## Overview

Bearing is a sales acceleration tool and service delivery platform. It provides quantified evidence of CMDB health issues that creates urgency, justifies remediation budgets, and positions Avennorth's product suite (Pathfinder, Contour) as the solution. This document covers how to use Bearing throughout the customer engagement lifecycle.

---

## The Sales Motion: Step by Step

### Step 1: Discovery Call

During initial conversations with a prospect, listen for these trigger phrases:

- "Our CMDB is a mess"
- "We don't trust our CMDB data"
- "Discovery isn't working" / "We turned off Discovery"
- "Service mapping is incomplete"
- "We can't do proper change impact analysis"
- "Our MTTR is too high because we can't find dependencies"
- "We're paying for ITAM/ITSM but the data isn't reliable"

**Your pitch**: "We can give you a quantified health assessment of your CMDB in under an hour. It's non-invasive -- we read CMDB tables, we never write to your production data. You'll get a score, a technical debt estimate in dollars, and a prioritized remediation roadmap."

### Step 2: Get Access

Bearing needs read-only access to CMDB tables. Two options:

**Option A: API Connection (preferred)**
- Request a ServiceNow service account with read access to `cmdb_ci`, `cmdb_rel_ci`, `cmdb_ci_service`, and related tables
- OAuth2 preferred, basic auth acceptable
- Bearing ONLY reads from CMDB tables and writes to its own `x_avnth_bearing_*` scoped app tables

**Option B: Scoped App Installation**
- The Bearing scoped app (`x_avnth_bearing`) includes five custom tables for storing results
- Install via ServiceNow application registry
- Results are visible natively in the customer's ServiceNow instance

**Key reassurance**: Bearing has a hard-coded write guard. It cannot write to any table that does not start with `x_avnth_bearing_`. This is enforced in code, not configuration.

### Step 3: Run the Assessment

```bash
curl -X POST http://bearing-server:8080/api/v1/assessments \
  -H "Content-Type: application/json" \
  -d '{"name": "Customer Name - Initial Assessment", "scope": "full"}'
```

The assessment typically completes in 2-10 minutes depending on CMDB size. It evaluates 8 dimensions:

1. **Completeness** (20%) -- Are required fields populated?
2. **Accuracy** (15%) -- Does data match reality (discovery validation)?
3. **Currency** (15%) -- How stale is the data?
4. **Relationships** (15%) -- Are service dependencies mapped?
5. **CSDM Compliance** (10%) -- Is the CSDM framework adopted?
6. **Classification** (10%) -- Are CIs in the right classes?
7. **Orphan Analysis** (10%) -- How many CIs have zero relationships?
8. **Duplicate Detection** (5%) -- Are there duplicate records?

### Step 4: Review Results Internally

Before presenting to the customer, review the results yourself:

**Check the overall score and grade** (A-F). Most first-time assessments score in the 25-55 range (D-F). This is normal and expected.

**Check the maturity level** (1-5). Most prospects are at Level 1 (Ad-hoc) or Level 2 (Managed).

**Check the technical debt estimate**. This is the dollar figure that creates budget urgency. Typical range: $100K-$2M depending on CMDB size.

**Identify the top 3 talking points**:
- The lowest-scoring dimension (biggest gap)
- The highest-count finding (most widespread issue)
- The critical findings count (most urgent)

### Step 5: Present to the Customer

Generate two reports:

**Health Scorecard PDF/DOCX** -- The executive summary. One page. Overall score, dimension breakdown, top findings. This is what goes to the CIO/VP.

```bash
curl -X POST http://bearing-server:8080/api/v1/reports/{assessment_id}/pdf \
  -H "Content-Type: application/json" \
  -d '{"report_type": "health_scorecard"}' \
  --output customer_scorecard.pdf
```

**Findings export** -- The detailed technical backup. Pull via API for your slide deck.

```bash
curl http://bearing-server:8080/api/v1/findings/{assessment_id}
```

### Step 6: Position Avennorth Products

Every finding maps to an Avennorth product recommendation:

| Dimension Problem | Avennorth Solution | Pitch |
|---|---|---|
| Low accuracy, no discovery validation | **Pathfinder** | "Pathfinder validates your CMDB against actual network traffic. It finds what Discovery misses." |
| Orphaned CIs, missing relationships | **Pathfinder** | "Pathfinder discovers dependencies automatically by observing real communication patterns." |
| CSDM not adopted, services unmapped | **Contour** | "Contour builds your service model automatically, mapping infrastructure to business services." |
| Generic classification | **Pathfinder** | "Pathfinder's behavioral classification identifies what CIs actually are based on traffic patterns." |
| Completeness gaps, stale data | **Pathfinder + Contour** | "Automated discovery and service mapping close these gaps without manual effort." |

### Step 7: Close the Engagement

Use the technical debt estimate to justify the engagement cost:

"Your CMDB technical debt is estimated at $750,000. Our remediation engagement costs $X. That's a Y:1 return on addressing the highest-risk issues first."

---

## Interpreting Results for Customers

### What the Score Means

| Score | Grade | What to Tell the Customer |
|---|---|---|
| 90-100 | A | "Your CMDB is in excellent shape. Focus on maintaining this with automated governance." |
| 75-89 | B | "Good foundation. A few targeted improvements will get you to best-in-class." |
| 60-74 | C | "Functional but with significant gaps. These gaps are costing you in incident response and change management." |
| 40-59 | D | "Your CMDB has serious data quality issues. Every major incident is slower because your teams can't trust this data." |
| 0-39 | F | "Your CMDB is not providing value in its current state. It's actively creating risk. Immediate action needed." |

### Maturity Levels

| Level | Label | Customer Explanation |
|---|---|---|
| 1 | Ad-hoc | "No structured CMDB management. Data is entered manually and rarely validated." |
| 2 | Managed | "Basic discovery is running, but data quality is inconsistent and there's no governance." |
| 3 | Defined | "CSDM framework is partially adopted. Discovery covers most infrastructure. Still gaps in service mapping." |
| 4 | Measured | "Strong governance. High discovery coverage. Metrics are tracked. A few areas need optimization." |
| 5 | Optimized | "Fully automated CMDB lifecycle. Continuous validation. Self-healing data quality." |

### The Technical Debt Number

The technical debt estimate translates CMDB gaps into dollars. Default assumptions:

- Hourly rate: $150 (adjustable per customer)
- Additional MTTR per incident from bad CMDB data: 1.5 hours
- Average incidents per year per affected CI: 12
- Risk exposure per orphaned CI: $5,000/year

Frame it as: "Every CI without an owner costs you $300/year in manual mapping during incidents. With 500 CIs missing owners, that's $150,000/year in avoidable incident resolution overhead."

---

## The Before/After Comparison

The most powerful sales tool is running Bearing AFTER remediation and showing the improvement.

### Process

1. Run initial assessment (before). Save the assessment_id.
2. Customer performs remediation (or Avennorth delivers the engagement).
3. Run follow-up assessment (after).
4. Generate Before/After report comparing both assessments.

### What to Highlight

- **Score improvement**: "Your overall health improved from 35 to 72 -- a 37-point jump."
- **Findings resolved**: "We eliminated 12 critical findings and 28 high-severity findings."
- **Debt reduction**: "Technical debt reduced from $1.2M to $340K."
- **Maturity advancement**: "You moved from Level 1 (Ad-hoc) to Level 3 (Defined)."

### Using Before/After to Sell Pathfinder

If the initial assessment was CMDB-only, then Pathfinder is deployed:

1. Run assessment WITHOUT Pathfinder data -- standard 8-dimension assessment.
2. Deploy Pathfinder. Wait for confidence data to accumulate (24-48 hours minimum).
3. Send Pathfinder confidence feed to Bearing webhook.
4. Run assessment WITH Pathfinder data -- assessment now includes fusion findings.

The fusion findings demonstrate what ONLY Pathfinder can detect:
- Shadow IT (active hosts with no CMDB record)
- Ghost CIs (CMDB says active, Pathfinder says dead)
- Behavioral misclassification (wrong CI class based on traffic)
- Unconfirmed relationships (CMDB relationships with no traffic backing)

Show the customer: "Without Pathfinder, your score was 42 with 15 findings. WITH Pathfinder, we found 5 additional critical issues that are invisible to any other tool. Your real score is 38."

---

## Generating and Presenting Reports

### Report Formats

| Format | Audience | Use Case |
|---|---|---|
| PDF | CIO, VP of IT, non-technical stakeholders | Email attachment, meeting handout |
| DOCX | Technical leads, CMDB managers | Editable, can incorporate into their own docs |
| API JSON | Your slide deck, custom analysis | Pull raw data for custom presentations |

### Presentation Tips

1. **Lead with the score and the dollar figure.** "Your CMDB health score is 35 out of 100, and that's costing your organization an estimated $850,000 per year in operational overhead."

2. **Show the dimension breakdown as a bar chart.** The lowest-scoring dimension is where you focus the conversation.

3. **Pick 2-3 findings to discuss in detail.** Choose findings that resonate with the customer's known pain points.

4. **Always end with "what's next."** Present the remediation roadmap: what to fix first, what Avennorth can automate, what the expected score improvement is.

---

## Common Customer Objections and Responses

### "Our CMDB is fine, we don't need an assessment."

Response: "Let's find out. The assessment is non-invasive and takes minutes. If your CMDB scores above 75, I'll tell you it's healthy and we can talk about maintaining that. But in our experience, 80% of organizations we assess score below 50."

### "We already run ServiceNow Health Scan."

Response: "Health Scan checks platform configuration -- update sets, ACLs, scripting issues. Bearing checks CMDB data quality -- are your CIs complete, accurate, current, and properly mapped? They're complementary. Health Scan tells you if the platform is configured correctly. Bearing tells you if the data IN the platform is trustworthy."

### "We don't want anyone connecting to our instance."

Response: "We understand. Bearing's API client has a hard-coded write guard -- it can only write to its own scoped app tables (x_avnth_bearing_*). It reads CMDB tables the same way any ServiceNow report does. We can also provide a scoped application if you prefer everything to run inside your instance."

### "That technical debt number seems high."

Response: "The estimate is based on industry-standard assumptions -- $150/hour for remediation work, 1.5 hours of additional MTTR per incident from bad data, 12 incidents per year per affected CI. We can adjust these parameters for your organization. Even at half our estimates, the numbers are significant."

### "We tried fixing our CMDB before and it didn't stick."

Response: "That's the maturity model problem. Manual remediation efforts decay because there's no continuous validation. That's exactly what Pathfinder solves -- it continuously observes your actual infrastructure and validates CMDB records against real traffic. The data stays accurate because the validation is automated."

### "Why not just use ServiceNow Discovery?"

Response: "Discovery is great for initial population, but it has blind spots. It uses scheduled scans, not continuous observation. It can't tell you if a CI's CMDB record matches actual behavior. Pathfinder does real-time, eBPF-based traffic observation. Together, they cover 100% of your infrastructure. Bearing quantifies the gap between what Discovery covers and what it misses."

---

## Engagement Workflow Summary

```
Discovery Call
    |
    v
Get ServiceNow Access (service account or scoped app)
    |
    v
Run Initial Assessment (5-10 minutes)
    |
    v
Review Results Internally
    |
    v
Present Health Scorecard to Customer
    |
    v
Propose Remediation Engagement
    |  (scope based on findings + debt estimate)
    v
Deliver Remediation
    |
    v
Deploy Pathfinder (if CMDB accuracy/relationships are issues)
    |
    v
Run Follow-Up Assessment
    |
    v
Present Before/After Comparison
    |
    v
Ongoing Monitoring (scheduled assessments)
```
