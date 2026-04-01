# Bearing Frequently Asked Questions

---

## Security and Data Access

### What access does Bearing need to my ServiceNow instance?

Bearing requires a service account with **read-only access** to CMDB, ITSM, and platform configuration tables. The required roles are `itil`, `asset`, and `cmdb_read`. Bearing does not need and should not be given admin, security_admin, or any write-capable roles.

### Does Bearing modify anything in my ServiceNow instance?

No. In API-only mode, Bearing reads data and stores all results in its own infrastructure. Nothing is written to your instance.

If you install the optional `x_avnth_bearing` scoped application, Bearing writes assessment results to its own scoped tables (`x_avnth_bearing_*`). These tables are completely isolated within the Bearing application scope and do not affect any other ServiceNow tables or processes.

### What data does Bearing read?

Bearing reads CMDB configuration data: CI records, relationships, class definitions, location records, and discovery status. It also reads a limited set of ITSM records (incidents, changes) for cross-reference validation -- for example, checking whether a CI marked as "Retired" still has open incidents assigned.

Bearing does **not** read:
- Passwords, credentials, or authentication tokens
- Personally identifiable information (PII) from HR or customer records
- Email content, chat logs, or communication records
- Financial data beyond what exists in standard CI fields
- Attachment content

A full list of tables Bearing reads is available in the Assessment Guide.

### Where are assessment results stored?

Assessment results are stored in Bearing's infrastructure, which runs on SOC 2 Type II compliant cloud services. Data is encrypted at rest and in transit. Each customer's data is isolated by organization and is never shared with other customers.

If the scoped application is installed, a copy of assessment metadata is also stored in your ServiceNow instance within the Bearing application scope.

### Can I restrict which CIs Bearing assesses?

Yes. Assessments can be scoped to specific CI classes, locations, support groups, or any other ServiceNow query filter. This is useful if you want to assess a specific business unit or environment before running a full assessment.

### How long is assessment data retained?

Assessment data is retained for the duration of your Bearing subscription. Full assessment detail is available for 90 days. After 90 days, detailed findings are archived and summary-level data (scores, dimension breakdowns, maturity level) remains available for trend analysis. Data is permanently deleted 30 days after subscription cancellation unless you request an export.

---

## Deployment and Architecture

### Does Bearing require installing agents on my infrastructure?

No. Bearing is a cloud-based platform that connects to your ServiceNow instance via the REST API. There are no agents to install, no on-premise components to maintain, and no infrastructure to manage.

Bearing itself does not deploy any agents. If you choose to also use Avennorth Pathfinder for behavioral observation (see Pathfinder Fusion below), Pathfinder has its own lightweight agent -- but that is a separate product and entirely optional.

### Does Bearing require installing anything on my ServiceNow instance?

Not necessarily. Bearing can operate in API-only mode, which requires nothing more than a service account. The optional `x_avnth_bearing` scoped application provides additional functionality (on-instance result storage, tighter security model integration) but is not required.

### What is the performance impact on my ServiceNow instance?

Minimal. Bearing uses standard REST API calls with pagination and built-in throttling. Queries are designed to be efficient and avoid bulk data operations. Most customers report no noticeable performance impact. Assessments can be scheduled during off-peak hours if your instance has tight performance budgets.

### Can Bearing assess multiple ServiceNow instances?

Yes. You can connect multiple ServiceNow instances to Bearing and run assessments on each independently. This is common for organizations with separate production, development, and test instances, or for consulting firms assessing multiple client instances.

---

## Pathfinder Fusion

### What is Pathfinder?

Avennorth Pathfinder is a separate product that deploys lightweight network observation agents to monitor traffic patterns across your infrastructure. Pathfinder sees which hosts are communicating, on which ports, and at what volume -- without inspecting packet contents.

### How does Pathfinder enhance Bearing?

When Pathfinder data is available for the same infrastructure that Bearing assesses, the two data sets are combined to produce **fusion findings** -- insights that neither product can produce alone:

- **Shadow IT detection:** Pathfinder observes active hosts that have no corresponding CI in the CMDB
- **Ghost CI detection:** The CMDB says a CI is operational, but Pathfinder observes no traffic
- **Classification validation:** Pathfinder's behavioral analysis suggests a CI should be classified differently based on observed traffic patterns
- **Relationship confirmation:** CMDB relationships are validated (or contradicted) by observed traffic between CIs

### Is Pathfinder required to use Bearing?

No. Bearing delivers complete assessments without Pathfinder. Every scoring dimension, finding type, maturity level, and report works independently. Pathfinder adds an optional layer of behavioral confidence that enriches the assessment when available.

### Can I add Pathfinder later?

Yes. You can run Bearing assessments without Pathfinder and add Pathfinder at any time. The next Bearing assessment after Pathfinder deployment will automatically incorporate the behavioral data and produce fusion findings. The Before/After comparison report will show the impact of adding Pathfinder.

---

## Integration with Other Avennorth Products

### What is Contour?

Avennorth Contour is a service mapping intelligence suite. Where Bearing measures CMDB health and Pathfinder discovers infrastructure, Contour builds and maintains service maps. When Bearing identifies gaps in CSDM adoption or service-level relationships, Contour is the tool that fills those gaps.

### What is Compass?

Avennorth Compass is the collective CRM and sales platform where assessment results, engagement scoping, and client management come together. Bearing assessment data can feed into Compass for proposal generation and engagement tracking.

### Do I need other Avennorth products to use Bearing?

No. Each Avennorth product works independently. Bearing is a standalone assessment platform. Integration with Pathfinder, Contour, and Compass adds value but is never required.

---

## Pricing

### How is Bearing priced?

Bearing is available in two models:

**Assessment-based:** Pay per assessment. Best for organizations that want an initial baseline or periodic health checks (annually or semi-annually).

**Continuous monitoring:** Subscription-based pricing for ongoing assessments at a regular cadence (weekly, biweekly, or monthly). Includes trend tracking, threshold alerts, and unlimited report generation. Best for organizations actively improving their CMDB and want to measure progress continuously.

Contact your Avennorth representative for current pricing.

### Is there a free trial or proof of concept?

Yes. Avennorth offers a proof-of-concept assessment for qualified organizations. This typically covers a scoped portion of your CMDB (one business unit, one location, or one CI class) to demonstrate the value of a full assessment. Contact your Avennorth representative to discuss a proof of concept.

---

## Technical Details

### Which ServiceNow versions does Bearing support?

Bearing supports ServiceNow **Utah and later** releases. This includes Utah, Vancouver, Washington DC, Xanadu, and subsequent releases. If you are running a pre-Utah version, contact your Avennorth representative to discuss compatibility.

### Does Bearing support Government Community Cloud (GCC) instances?

Yes. Bearing can connect to GCC ServiceNow instances. Additional network configuration may be required. Contact your Avennorth representative for GCC-specific setup guidance.

### How long does an assessment take?

Assessment duration depends on instance size. A small instance (under 5,000 CIs) typically completes in 15-30 minutes. A large instance (25,000-100,000 CIs) takes 1-3 hours. Very large instances (100,000+ CIs) may take 3-6 hours. The assessment runs as a background process.

### Can I run assessments on a schedule?

Yes, in continuous monitoring mode. You can configure assessments to run weekly, biweekly, or monthly. Results are automatically compared to previous assessments to track trends.

### What happens if the assessment encounters an error?

Bearing is designed for resilience. If a specific table query fails (due to permissions, network timeout, or table not existing), Bearing logs the error and continues with the remaining tables. The assessment completes with a note about which tables could not be accessed. Dimension scores are calculated based on available data, with missing data clearly flagged.

### Can I export my assessment data?

Yes. Assessment results can be exported in JSON format for integration with other tools or for archival purposes. Reports are available in PDF and DOCX formats. Contact your Avennorth representative if you need bulk data export.

### Does Bearing support multi-tenancy?

Yes. Bearing is built for multi-tenancy from the ground up. Consulting firms can manage multiple client assessments from a single Bearing account. Each client's data is completely isolated -- no cross-client data access is possible, even for the consulting firm's own administrators, unless explicitly authorized.

---

## Still Have Questions?

Contact your Avennorth representative or email support@avennorth.com. We typically respond within one business day.
