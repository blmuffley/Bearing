# Avennorth Bearing: CMDB Health Assessment Platform

## Know the True Health of Your CMDB in Hours, Not Months

Every organization running ServiceNow depends on its Configuration Management Database (CMDB) to power incident management, change impact analysis, service mapping, and executive reporting. But most organizations have no reliable way to measure whether their CMDB data is accurate, complete, or trustworthy.

Avennorth Bearing is a purpose-built assessment platform that connects to your ServiceNow instance, analyzes your CMDB across eight quality dimensions, scores your technical debt, and delivers actionable remediation plans -- all within hours of your first assessment.

---

## What Bearing Does

Bearing performs a comprehensive, non-invasive analysis of your CMDB by reading configuration data from your ServiceNow instance and evaluating it against industry best practices, ServiceNow's Common Service Data Model (CSDM), and patterns observed across hundreds of enterprise deployments.

**In a single assessment, Bearing delivers:**

- **A health score (0-100)** that quantifies overall CMDB quality across eight weighted dimensions
- **A maturity level (1-5)** that maps your current CMDB operations to an industry-standard maturity model
- **A technical debt estimate** expressed in hours and dollars, showing the cost of bringing your CMDB to a healthy state
- **Prioritized findings** ranked by severity, remediation effort, and business risk, so your team knows exactly where to start
- **Executive-ready reports** that communicate CMDB health to technical teams and business leadership in the language each audience needs

---

## Who Bearing Is For

Bearing serves two audiences:

**ServiceNow consulting firms** use Bearing to run assessments for their clients. Bearing replaces weeks of manual discovery with a structured, repeatable assessment that produces professional reports and scoped remediation plans. Consultants get findings backed by data, not opinions -- and those findings translate directly into engagement scope.

**Enterprise IT teams** use Bearing to establish a baseline, track improvement over time, and justify investment in CMDB quality. Instead of arguing about whether the CMDB is "good enough," teams get an objective score and a clear path forward.

---

## The Eight Dimensions of CMDB Health

Bearing evaluates your CMDB across eight dimensions, each weighted according to its impact on downstream ServiceNow processes:

| Dimension | Weight | What It Measures |
|-----------|--------|-----------------|
| **Completeness** | 20% | Are required fields populated? Do CIs have the attributes needed for downstream processes? |
| **Accuracy** | 15% | Does the data match reality? Are IP addresses, hostnames, and hardware specs correct? |
| **Currency** | 15% | Is the data current? When was each CI last updated or validated? |
| **Relationships** | 15% | Are dependencies mapped? Can you trace from infrastructure to application to service? |
| **CSDM Alignment** | 10% | Does your data model follow ServiceNow's Common Service Data Model framework? |
| **Classification** | 10% | Are CIs in the right CI classes? Are naming conventions consistent? |
| **Orphan Detection** | 10% | How many CIs exist in isolation with no relationships to anything? |
| **Duplicate Detection** | 5% | Are there redundant records for the same asset? |

Each dimension produces a score from 0 to 100. These scores are combined using the weights above to produce an overall health score.

---

## The CMDB Maturity Model

Beyond the health score, Bearing maps your organization to a five-level maturity model:

| Level | Name | Description |
|-------|------|-------------|
| **1** | Ad-Hoc | Manual CI entry, no automated discovery, no CSDM adoption |
| **2** | Reactive | Some discovery tools running, basic CI population, some relationships |
| **3** | Defined | CSDM partially adopted, automated discovery covering 60%+, service maps emerging |
| **4** | Managed | Confidence scoring on CIs, health monitoring active, automated governance |
| **5** | Optimized | Full CSDM adoption, autonomous CMDB operations, continuous assessment |

The maturity model gives your leadership team a clear picture of where you are today and what it takes to reach the next level.

---

## Technical Debt Quantification

Every finding Bearing identifies is mapped to a remediation pattern with an estimated effort range. Bearing aggregates these estimates to produce a total technical debt figure expressed in hours and, when rate information is configured, in dollars.

This is not a vague "you have problems" assessment. It is a specific, itemized accounting of what needs to be fixed, how long each fix will take, and where to start for maximum impact. Findings are prioritized using a composite score that balances severity, effort, and risk -- so quick wins with high impact surface first.

---

## Pathfinder Fusion: Behavioral Confidence

Bearing assessments are powerful on their own. But when paired with Avennorth Pathfinder -- a lightweight network observation platform -- the assessment becomes significantly richer.

Pathfinder monitors actual network traffic to and from your infrastructure. When Pathfinder data is available, Bearing produces **fusion findings** that can only be detected by comparing what your CMDB says against what your network actually does:

- **Shadow IT:** Active hosts observed on the network with no corresponding CMDB record
- **Ghost CIs:** CMDB records marked as operational, but no network traffic observed
- **Misclassified assets:** CIs whose observed behavior does not match their CMDB classification
- **Relationship validation:** Confirmation (or contradiction) of CMDB relationships based on actual traffic patterns

Pathfinder integration is entirely optional. Bearing delivers full value without it. When Pathfinder data is available, it adds a layer of behavioral confidence that static assessment alone cannot provide.

---

## Reports and Deliverables

Every Bearing assessment produces five report types:

1. **CMDB Health Scorecard** -- A single-page executive summary with scores, grade, and top findings
2. **Technical Debt Summary** -- Itemized debt broken down by dimension, severity, and remediation effort
3. **Maturity Model Report** -- Current maturity level with a roadmap to the next level
4. **Recommendation Report** -- Prioritized remediation actions with effort estimates
5. **Before/After Comparison** -- Side-by-side analysis showing improvement between assessments

Reports are generated in PDF and DOCX formats and can be customized with your organization's branding.

---

## How It Works

1. **Connect** -- Provide Bearing with read-only access to your ServiceNow instance via OAuth or a service account, or upload an assessment export
2. **Scan** -- Bearing reads configuration metadata across CMDB tables (it writes nothing to your instance except within its own scoped application tables)
3. **Score** -- Findings are evaluated, scored, and prioritized across all eight dimensions
4. **Report** -- Review results on the interactive dashboard or download executive reports

A typical first assessment completes in under two hours.

---

## Getting Started

To schedule a Bearing assessment or learn more about how Avennorth can help you measure and improve your CMDB health, contact your Avennorth representative or visit [avennorth.com](https://avennorth.com).
