# Bearing CMDB Maturity Model

## Understanding Where You Are and How to Advance

The Bearing Maturity Model provides a practical framework for understanding your organization's CMDB operational maturity. Rather than measuring data quality alone (that is what the health score does), the maturity model evaluates the processes, automation, and governance your organization has in place to maintain CMDB quality over time.

A high health score at a low maturity level means you cleaned up the data but have not built the systems to keep it clean. A low health score at a high maturity level is unusual -- it means you have the right processes but something is broken. Both the score and the maturity level matter.

---

## The Five Maturity Levels

### Level 1: Ad-Hoc

**What it looks like in practice:**

Your CMDB was populated through a combination of manual data entry, spreadsheet imports, and perhaps a few discovery runs that were never repeated. There is no regular process for updating CI records. When someone needs infrastructure information, they check the CMDB, find it unreliable, and go ask someone who knows. The CMDB exists as a system of record in name only.

**Typical characteristics:**
- CI records are created manually and updated rarely or never
- No automated discovery is running, or discovery was run once and not maintained
- No adoption of ServiceNow's Common Service Data Model (CSDM)
- Relationships between CIs are sparse or nonexistent
- Health score is typically below 30
- Teams do not trust the CMDB and maintain their own spreadsheets

**What keeps organizations at this level:**
- CMDB was stood up as a checkbox exercise rather than an operational tool
- No dedicated CMDB owner or governance process
- Discovery tools were purchased but never properly configured
- Data quality is "someone else's problem"

**What it takes to reach Level 2:**
- Assign a CMDB owner responsible for data quality
- Deploy and configure automated discovery for at least one network segment
- Begin populating basic CI attributes (hostname, IP, OS, location) through discovery
- Start mapping relationships for your most critical applications

---

### Level 2: Reactive

**What it looks like in practice:**

Discovery tools are running on some network segments. Basic CI data is being collected automatically for servers and network devices. Some relationships exist, but they were mapped manually during specific projects. When problems are found in the CMDB, someone fixes them -- but there is no proactive process to prevent them. Quality improvements happen in response to incidents or audit findings.

**Typical characteristics:**
- Automated discovery covers some but not all infrastructure (typically 30-60%)
- Basic CI attributes are populated for discovered assets
- Some relationships mapped, often manually during service mapping projects
- CMDB health is monitored occasionally, not continuously
- Health score typically falls between 30 and 54
- Teams use the CMDB for some processes but work around it for others

**What keeps organizations at this level:**
- Discovery coverage gaps leave large portions of infrastructure unmanaged
- No standard process for new CI onboarding or decommission
- Relationship mapping is project-based rather than ongoing
- Data quality is checked when someone complains, not on a schedule

**What it takes to reach Level 3:**
- Expand discovery to cover 60% or more of infrastructure
- Begin CSDM adoption by populating at least two layers (Infrastructure + one service layer)
- Implement basic CI lifecycle workflows (creation, validation, retirement)
- Establish a regular cadence for CMDB quality reviews (monthly or quarterly)
- Start building service maps for your top 10 business services

---

### Level 3: Defined

**What it looks like in practice:**

CMDB operations follow defined processes. Discovery covers the majority of infrastructure. CSDM is partially adopted, with at least two layers populated. Service maps exist for critical services. There is a governance process -- perhaps a CMDB advisory board or a data steward program -- that reviews quality on a regular schedule. The CMDB is the primary source of truth for incident routing, change impact, and service health.

**Typical characteristics:**
- Automated discovery covers 60% or more of infrastructure
- CSDM partially adopted with at least the Infrastructure and Business Application layers
- Service maps are emerging for key business services
- Defined processes for CI lifecycle management
- Regular quality reviews on a monthly or quarterly cadence
- Health score typically falls between 55 and 74
- The CMDB is actively used for incident management and change impact analysis

**What keeps organizations at this level:**
- Discovery covers known infrastructure but misses shadow IT and dynamic environments
- CSDM adoption stalls after the first two layers
- Governance processes exist but are manual and time-consuming
- No automated enforcement of data quality standards
- Relationship maintenance depends on manual effort

**What it takes to reach Level 4:**
- Implement CI confidence scoring to quantify trust in individual records
- Activate health monitoring that continuously tracks CMDB quality metrics
- Deploy automated governance rules (duplicate detection, stale CI retirement, required field enforcement)
- Expand CSDM to three or four layers with active relationship maintenance
- Move from periodic quality reviews to continuous monitoring with threshold-based alerts

---

### Level 4: Managed

**What it looks like in practice:**

CMDB quality is measured continuously, not periodically. Confidence scores on individual CIs tell you which records can be trusted and which need attention. Automated governance rules enforce data quality standards -- duplicates are flagged and merged, stale CIs are retired, required fields are enforced at creation. The CMDB advisory board reviews dashboards, not spreadsheets. When quality drops, automated alerts notify the team before the impact is felt downstream.

**Typical characteristics:**
- Confidence scores on CI records based on discovery validation frequency and data quality
- Continuous health monitoring with automated threshold alerts
- Automated governance rules for deduplication, stale record management, and field validation
- CSDM adopted across three or more layers
- Health score typically falls between 75 and 89
- The CMDB drives automated workflows, not just reporting

**What keeps organizations at this level:**
- Full CSDM adoption across all four layers remains incomplete
- Some network segments or environments (cloud, containers) lack discovery coverage
- Relationship maintenance still requires some manual intervention
- Assessment and quality improvement are separate activities rather than a continuous loop

**What it takes to reach Level 5:**
- Achieve full CSDM adoption across all four layers plus Service Offerings
- Implement autonomous CMDB operations where quality issues are detected and remediated without human intervention
- Deploy continuous assessment that runs automatically and feeds directly into governance workflows
- Extend discovery and observation to all environments including cloud, containers, and dynamic infrastructure
- Close the feedback loop between assessment findings and automated remediation

---

### Level 5: Optimized

**What it looks like in practice:**

The CMDB operates autonomously. Discovery and observation tools continuously validate every CI. New assets are automatically discovered, classified, and placed into the correct CSDM layer. Stale records are automatically retired. Duplicate records are automatically merged. Relationship changes detected through traffic observation are reflected in the CMDB without manual intervention. Continuous assessment runs in the background, and the health score is an operational metric tracked alongside uptime and SLA performance.

**Typical characteristics:**
- Full CSDM adoption across all four layers with Service Offerings
- Autonomous CMDB operations with minimal manual intervention
- Continuous assessment integrated into operational workflows
- All infrastructure environments covered by discovery and observation
- Health score consistently at 90 or above
- The CMDB is the single source of truth -- no competing spreadsheets, no workarounds

**What organizations at this level focus on:**
- Maintaining the autonomous systems that keep the CMDB healthy
- Extending coverage to new environments and infrastructure types
- Using CMDB data for advanced use cases: predictive impact analysis, automated remediation, capacity optimization
- Contributing to industry benchmarks and refining best practices

---

## How Bearing Determines Your Maturity Level

Bearing evaluates maturity based on a combination of signals:

1. **Health score range** -- Each maturity level corresponds to a health score band, though the score alone does not determine maturity
2. **Discovery coverage** -- What percentage of CIs have been validated by automated discovery
3. **CSDM layer population** -- How many CSDM layers contain data
4. **Data freshness patterns** -- Whether CIs are being updated regularly, indicating active governance
5. **Relationship coverage** -- Whether dependency mapping is comprehensive or sparse
6. **Governance indicators** -- Presence of dedup rules, lifecycle workflows, and quality enforcement

Your maturity level reflects the combination of these signals, not any single metric.

---

## Using the Maturity Model

The maturity model is most useful as a communication tool and a planning framework:

**For executive communication:** "We are at Level 2. Here is what Level 3 looks like, here is what it costs to get there, and here is why it matters."

**For planning:** Each level's advancement criteria map to specific projects and investments. Your remediation plan can be organized around maturity level targets rather than an abstract list of findings.

**For benchmarking:** Knowing your maturity level helps you compare your organization against peers. Most enterprises running ServiceNow for 3+ years operate at Level 2 or 3. Reaching Level 4 is a meaningful achievement. Level 5 is aspirational for most organizations.

**For tracking progress:** Run Bearing assessments periodically to measure advancement. The Before/After comparison report shows exactly how much progress you have made and what remains.
