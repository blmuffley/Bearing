# Bearing Scoring Dimensions Explained

## How Bearing Measures CMDB Health

Bearing evaluates your CMDB across eight distinct dimensions. Each dimension measures a specific aspect of data quality, and each contributes a weighted portion to your overall health score. This document explains what each dimension measures, why it matters, how Bearing calculates the score, what findings look like, and what you can do to improve.

---

## How the Overall Score Is Calculated

Your overall health score is a weighted composite of all eight dimension scores:

```
Overall Score = (Completeness x 0.20) + (Accuracy x 0.15) + (Currency x 0.15)
              + (Relationships x 0.15) + (CSDM x 0.10) + (Classification x 0.10)
              + (Orphans x 0.10) + (Duplicates x 0.05)
```

Each dimension is scored from 0 to 100. The weights reflect the relative impact each dimension has on downstream ServiceNow processes like incident management, change impact analysis, and service mapping.

---

## 1. Completeness (20%)

### What It Measures
Completeness evaluates whether CIs have the required fields populated for their class. A server CI should have an IP address, hostname, operating system, location, support group, and environment. An application CI should have an owner, version, and associated business service. Completeness checks whether these fields actually contain values.

### Why It Matters
Incomplete CI records cannot support the processes that depend on them. A server without a support group cannot be routed for incident response. An application without an owner cannot be included in change advisory board reviews. Missing data does not just reduce reporting quality -- it breaks workflows.

### How the Score Is Calculated
Bearing defines a set of required fields for each major CI class based on ServiceNow best practices and CSDM requirements. The completeness score is the percentage of required fields that are populated across all assessed CIs.

### Example Findings
- "7,560 of 18,000 CIs have all required fields populated"
- "4,200 servers are missing the support_group field"
- "380 applications have no owner assigned"

### How to Improve
- Identify the most impactful missing fields (support group, owner, environment) and prioritize those first
- Configure discovery to populate hardware and network fields automatically
- Implement data quality rules that require key fields before a CI can be marked Operational
- Use bulk update tools to fill gaps in existing records

---

## 2. Accuracy (15%)

### What It Measures
Accuracy evaluates whether the data in CI records matches reality. Are the IP addresses resolvable? Do hostnames match Active Directory? Are hardware specifications (RAM, CPU, disk) consistent with what discovery reports? Accuracy checks whether the values in your CMDB can be trusted.

### Why It Matters
Inaccurate CMDB data is worse than missing data, because people make decisions based on it. If a server's IP address is wrong, remote management tools point to the wrong machine. If hardware specs are incorrect, capacity planning produces wrong results. Accuracy is the foundation of CMDB trustworthiness.

### How the Score Is Calculated
Bearing performs internal consistency checks and cross-reference validation. It compares IP addresses against naming patterns, checks for impossible hardware values (0 RAM, 0 CPU), validates that location references point to actual location records, and flags CIs whose attributes conflict with their assigned class.

When Pathfinder data is available, Bearing adds behavioral validation: comparing what the CMDB says about a CI against what network observation reveals about that CI's actual behavior.

### Example Findings
- "890 CIs have IP addresses that do not resolve in DNS"
- "560 CIs have hostnames not found in Active Directory"
- "780 servers have RAM or CPU values of zero"
- "310 CIs are in production subnets but tagged as non-production"

### How to Improve
- Deploy or expand automated discovery to validate CI attributes against live infrastructure
- Implement reconciliation rules that flag mismatches between discovery data and CMDB records
- Standardize vendor and manufacturer names using transformation maps
- Cross-reference CMDB data with authoritative sources (DNS, AD, IP address management systems)

---

## 3. Currency (15%)

### What It Measures
Currency evaluates how recently each CI was updated or validated. A CI that was last touched three years ago is unlikely to reflect current reality. Currency measures the freshness of your CMDB data.

### Why It Matters
Infrastructure changes constantly. Servers are patched, moved, re-IPed, and decommissioned. Applications are upgraded, migrated, and retired. If CMDB records are not updated to reflect these changes, the database drifts further from reality with every passing day. Stale data leads to incorrect impact analysis, failed changes, and inaccurate reporting.

### How the Score Is Calculated
Bearing examines the last update timestamp for each CI and categorizes records by staleness:
- **Current:** Updated within 30 days
- **Aging:** Updated 30-90 days ago
- **Stale:** Updated 90-180 days ago
- **Critical:** Not updated in 180+ days

The currency score reflects the proportion of CIs that are current or aging versus stale or critical.

### Example Findings
- "1,200 CIs not updated in 180+ days"
- "2,800 CIs stale for 90-180 days"
- "Only 32% of CIs updated in the last 30 days"
- "230 CIs marked Operational but not seen by discovery in 365+ days"
- "Discovery schedules not running for 3 network segments"

### How to Improve
- Ensure discovery schedules cover all network segments and run on a regular cadence
- Investigate and fix failed discovery schedules immediately
- Implement CI lifecycle workflows that require periodic revalidation
- Retire CIs that have not been validated in 180+ days after confirming decommission
- Enable automated CI status transitions based on discovery results

---

## 4. Relationships (15%)

### What It Measures
Relationships evaluate whether dependencies between CIs are mapped. Bearing checks for server-to-application, application-to-service, database-to-application, and network device connections. It measures both the presence and the completeness of your dependency model.

### Why It Matters
Without relationships, your CMDB is a flat list of assets. Relationships transform it into a dependency model that enables impact analysis ("if this server goes down, what services are affected?"), change collision detection ("are two changes affecting the same service?"), and service mapping ("what infrastructure supports this business service?"). Relationships are what make a CMDB a CMDB rather than just an inventory.

### How the Score Is Calculated
Bearing evaluates the percentage of CIs that have at least one meaningful relationship, the percentage of critical CIs (Tier 1 applications, production servers) with complete dependency chains, and the coverage of key relationship types (runs_on, hosted_on, connects_to, depends_on).

### Example Findings
- "12,420 CIs have no service dependencies mapped (69%)"
- "2,800 servers with no application mapping"
- "68% of integrations are undocumented"
- "45 Tier 1 applications have zero dependencies mapped"
- "180 databases have no application relationship"
- "520 network devices with no connections mapped"

### How to Improve
- Prioritize dependency mapping for Tier 1 applications and production infrastructure
- Deploy traffic-based discovery tools to observe actual communication patterns
- Map databases to applications using connection string analysis
- Document integration points between applications
- Use Pathfinder behavioral observation to validate and create relationships automatically

---

## 5. CSDM Alignment (10%)

### What It Measures
CSDM (Common Service Data Model) alignment evaluates whether your CMDB follows ServiceNow's recommended data architecture. CSDM defines four layers: Infrastructure, Technical Services, Business Applications, and Business Services. Bearing checks how many of these layers are populated and how well your data conforms to the model.

### Why It Matters
CSDM is not just a theoretical framework. It is the foundation for ServiceNow's service-aware platform features, including Service Mapping, Service Portfolio Management, and the CMDB Health Dashboard. Organizations that do not adopt CSDM cannot fully leverage these capabilities. As ServiceNow continues to invest in CSDM-aware features, alignment becomes increasingly important for platform ROI.

### How the Score Is Calculated
Bearing evaluates the presence and population of each CSDM layer:
- **Infrastructure layer** (servers, network, storage)
- **Technical Service layer** (application clusters, middleware)
- **Business Application layer** (portfolio of business applications)
- **Business Service layer** (customer-facing and internal services)
- **Service Offerings** (specific offerings within each service)

The score reflects how many layers are populated, how completely, and whether the relationships between layers follow CSDM conventions.

### Example Findings
- "Only Infrastructure layer populated"
- "No Business Service layer defined"
- "No Business Application layer defined"
- "No Technical Service layer defined"
- "Zero Service Offerings defined"

### How to Improve
- Start with Business Services -- identify your organization's key services and create Business Service CIs
- Define Business Applications from your existing application inventory
- Bridge the gap with Technical Services that connect applications to infrastructure
- Create Service Offerings for each Business Service
- Work with ServiceNow's CSDM guide and Avennorth's Contour service mapping tools to build out each layer systematically

---

## 6. Classification (10%)

### What It Measures
Classification evaluates whether CIs are assigned to the correct CI class with appropriate specificity. A server should be classified as `cmdb_ci_linux_server` or `cmdb_ci_win_server`, not just `cmdb_ci_computer`. Classification also checks for consistent naming conventions and proper use of the CI class hierarchy.

### Why It Matters
CI classification drives how ServiceNow processes treat each record. Discovery patterns, identification rules, reconciliation rules, and CMDB Health checks all depend on correct classification. A server classified as a generic `cmdb_ci` will not be evaluated by server-specific health rules, will not match server discovery patterns, and will not appear in server-specific reports.

### How the Score Is Calculated
Bearing examines the distribution of CIs across classes and flags records in overly generic classes (like `cmdb_ci` or `cmdb_ci_computer` without a subclass), CIs whose attributes conflict with their classification, and inconsistent naming patterns that suggest classification errors.

### Example Findings
- "810 CIs in generic cmdb_ci class instead of a specific subclass"
- "450 servers classified as cmdb_ci_computer without a platform-specific subclass"
- "145 CIs have attributes inconsistent with their class"
- "Mixed naming conventions across server CIs"

### How to Improve
- Reclassify generic CIs into appropriate subclasses based on their attributes
- Enable discovery-driven classification so new CIs are placed in the correct class automatically
- Implement identification rules that enforce proper classification
- Standardize naming conventions and enforce them through data quality rules
- Regularly audit the cmdb_ci base class for records that should be in a subclass

---

## 7. Orphan Detection (10%)

### What It Measures
Orphan detection identifies CIs that exist in complete isolation -- no relationships to any other CI, no association with any service, no connection to any support group or application. These records are disconnected islands in your CMDB.

### Why It Matters
Orphaned CIs are invisible to every process that depends on relationships. They will not appear in impact analysis. They will not be included in service maps. Changes to orphaned infrastructure will not trigger any downstream notifications. In a crisis, orphaned CIs are blind spots -- you do not know what depends on them or what they depend on.

Beyond operational risk, orphaned CIs represent wasted investment. Your team spent time and resources creating these records, but without relationships, they deliver no value.

### How the Score Is Calculated
Bearing calculates the percentage of total CIs that have zero relationships. It applies additional weight to orphaned CIs in critical classes (servers, databases, applications) compared to less impactful classes.

### Example Findings
- "4,100 orphaned CIs with zero relationships (23% of total)"
- "1,860 servers are orphaned"
- "420 database CIs with zero relationships"

### How to Improve
- Prioritize orphaned servers and databases -- these are the highest-risk blind spots
- Deploy relationship discovery tools to automatically map dependencies
- Implement governance rules that flag new CIs created without relationships
- Run periodic orphan audits and resolve the backlog in prioritized batches
- Use Pathfinder traffic observation to discover relationships for orphaned infrastructure automatically

---

## 8. Duplicate Detection (5%)

### What It Measures
Duplicate detection identifies CI records that likely represent the same physical or logical asset. Bearing checks for duplicate serial numbers, matching hostnames, overlapping IP addresses, and other indicators that two records describe the same thing.

### Why It Matters
Duplicate CIs create confusion. Incidents may be logged against the wrong record. Changes may be approved based on incomplete impact analysis (because the impact was split across two records). Asset counts become inflated, skewing capacity planning and license compliance. Duplicates erode trust in the CMDB because users encounter conflicting information for what they know is a single asset.

### How the Score Is Calculated
Bearing identifies potential duplicates using multi-attribute matching (serial number, hostname, IP address, MAC address) and calculates the percentage of CIs that are likely duplicates. The score penalizes based on the volume and severity of detected duplicates.

### Example Findings
- "340 potential duplicate CIs detected"
- "78 servers share serial numbers with other CIs"
- "Primary causes: manual entry without dedup checks, multiple discovery sources"

### How to Improve
- Enable ServiceNow's built-in CMDB deduplication rules
- Configure identification rules for each major CI class
- Review and merge confirmed duplicates
- Ensure discovery sources are properly reconciled to avoid creating new duplicates
- Implement data quality rules that check for duplicates before allowing new CI creation

---

## Reading Your Dimension Scores Together

No single dimension tells the full story. A CMDB can score well on completeness (fields are populated) but poorly on accuracy (the values are wrong). It can score well on classification (CIs are in the right classes) but poorly on relationships (those CIs are isolated).

The overall health score captures this interplay. When reviewing your assessment, look for patterns:

- **Low completeness + low accuracy** often indicates manual data entry without validation
- **Low currency + low relationships** suggests discovery is not running or not configured to map dependencies
- **Low CSDM + low relationships** means service-level visibility is missing entirely
- **High classification + low completeness** means the structure is right but the data is thin

Your Bearing assessment identifies these patterns and recommends remediation sequences that address root causes, not just symptoms.
