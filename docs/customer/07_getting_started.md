# Getting Started with Bearing

## From Zero to Your First Assessment in Six Steps

This guide walks you through setting up Bearing and running your first CMDB health assessment. The entire process typically takes less than an hour, and your first results will be available within minutes of starting the scan.

---

## Step 1: Create a Service Account in ServiceNow

Create a dedicated user account in your ServiceNow instance for Bearing to use.

1. Navigate to **User Administration > Users** in your ServiceNow instance
2. Click **New** to create a new user
3. Fill in the following:
   - **User ID:** `svc_avnth_bearing`
   - **First Name:** Avennorth
   - **Last Name:** Bearing Service
   - **Email:** A monitored mailbox or distribution list (for password reset notifications)
   - **Active:** Checked
4. Set a strong password (16+ characters, mixed case, numbers, symbols)
5. Save the record

**Assign roles to the service account:**

1. Open the newly created user record
2. Scroll to the **Roles** related list
3. Add the following roles:
   - `itil`
   - `asset`
   - `cmdb_read`
4. Save

The service account now has read-only access to the tables Bearing needs. It cannot create, modify, or delete records.

---

## Step 2: Configure Authentication

Choose one of two authentication methods.

### Option A: OAuth 2.0 (Recommended)

1. In ServiceNow, navigate to **System OAuth > Application Registry**
2. Click **New**, then select **Create an OAuth API endpoint for external clients**
3. Configure the application:
   - **Name:** Avennorth Bearing
   - **Client ID:** Auto-generated (copy this value)
   - **Client Secret:** Auto-generated (copy this value securely)
   - **Redirect URL:** `https://app.avennorth.com/auth/callback` (confirm with your Avennorth representative)
   - **Token Lifespan:** `1800` (seconds)
   - **Refresh Token Lifespan:** `8640000` (seconds)
   - **Active:** Checked
4. Save the record
5. Share the Client ID and Client Secret with your Avennorth representative through a secure channel (encrypted email, password manager share, or secure file transfer)

### Option B: Basic Authentication

If OAuth is not available in your environment:

1. Use the service account credentials (username and password) created in Step 1
2. Share them with your Avennorth representative through a secure channel
3. Credentials are encrypted immediately upon receipt and stored encrypted at rest

---

## Step 3: Configure the Connection in Bearing

Your Avennorth representative will configure the connection, or you can do it yourself in the Bearing dashboard:

1. Log in to Bearing at `https://app.avennorth.com`
2. Navigate to **Connections** in the left sidebar
3. Click **New Connection**
4. Enter your instance details:
   - **Customer Name:** Your organization name
   - **Instance URL:** `https://yourinstance.service-now.com`
   - **Connection Type:** OAuth or Basic Auth
   - **Credentials:** As configured in Step 2
5. Click **Test Connection**

Bearing will verify that it can authenticate and access the required tables. If the connection test succeeds, you will see a green confirmation with your instance version and CI count.

If the test fails, the error message will indicate what went wrong -- typically a network access issue, incorrect credentials, or missing role assignment.

---

## Step 4: Run Your First Assessment

1. Navigate to **Assessments** in the left sidebar
2. Click **New Assessment**
3. Select the connection you configured in Step 3
4. Choose your assessment scope:
   - **Full Assessment** (recommended for first run) -- scans all CMDB tables across all eight dimensions
   - **Targeted Assessment** -- scans a specific CI class, location, or support group
5. Click **Start Assessment**

The assessment begins running in the background. You can navigate away from the page -- the scan continues whether you are watching or not. You will receive a notification when it completes.

**For API-based assessments,** you can also trigger an assessment via the REST API:

```
POST https://app.avennorth.com/api/v1/assessments
Content-Type: application/json
Authorization: Bearer {your_api_token}

{
  "connection_id": "your-connection-id",
  "scan_type": "full",
  "modules": ["cmdb", "itsm", "core"]
}
```

The API returns an assessment ID that you can use to check status:

```
GET https://app.avennorth.com/api/v1/assessments/{assessment_id}
Authorization: Bearer {your_api_token}
```

Response:
```json
{
  "id": "assessment-id",
  "status": "complete",
  "health_score": 34,
  "maturity_level": 1,
  "findings_count": 214,
  "critical_findings": 47,
  "completed_at": "2026-02-15T12:30:00Z"
}
```

---

## Step 5: Review Your Results

Once the assessment completes, your results are available in three places:

### The Interactive Dashboard

Navigate to **Assessments** and click on your completed assessment. The dashboard shows:

- **Health score gauge** -- your overall score from 0 to 100
- **Maturity level** -- your current level on the 1-5 scale
- **Technical debt estimate** -- the total estimated cost to remediate all findings
- **Dimension scores** -- individual scores for each of the eight quality dimensions
- **Findings explorer** -- a searchable, filterable table of every finding

![Bearing Dashboard](/screenshots/01_dashboard_pre.png)

*The assessment dashboard displays your health score, dimension breakdowns, maturity level, and technical debt estimate in a single view.*

Use the dimension scores to identify your weakest areas. Click into individual findings to see the specific CIs affected and the recommended remediation for each.

### The Findings Explorer

The findings explorer lets you sort and filter findings by:
- **Severity:** Critical, High, Medium, Low
- **Dimension:** Completeness, Accuracy, Currency, Relationships, CSDM, Classification, Orphans, Duplicates
- **Effort:** Estimated hours to remediate
- **Automation potential:** Whether the fix can be automated

Start with the critical findings. These are the issues causing the most damage to your CMDB's usefulness today.

### Quick Wins

Look for findings that combine **high severity with low effort**. These are your quick wins -- they deliver meaningful score improvement for minimal investment. Common quick wins include:

- Enabling built-in deduplication rules
- Fixing zero-value hardware fields
- Standardizing vendor names
- Retiring CIs that have been stale for over 180 days
- Restarting failed discovery schedules

---

## Step 6: Generate Reports

From the assessment detail page:

1. Click **Reports** in the assessment navigation
2. Select the report type you want to generate:
   - **CMDB Health Scorecard** -- single-page executive summary
   - **Technical Debt Summary** -- itemized debt with effort estimates
   - **Maturity Model Report** -- current level with advancement roadmap
   - **Recommendation Report** -- prioritized remediation actions
3. Choose your format: **PDF** or **DOCX**
4. Click **Generate**

Reports are generated in seconds and available for immediate download. You can regenerate reports at any time -- the underlying assessment data does not change.

The **Before/After Comparison** report becomes available after you run your second assessment. It shows the delta between any two assessment points.

---

## What Comes Next

After your first assessment, here are the recommended next steps:

1. **Share the Health Scorecard** with your CMDB program sponsor or IT leadership. The one-page summary communicates the current state clearly and concisely.

2. **Review the Recommendation Report** with your CMDB team. Identify which quick wins you can execute in the next 2-4 weeks.

3. **Plan Phase 1 remediation** using the Technical Debt Summary to scope the work. Focus on the highest-impact findings first.

4. **Schedule a follow-up assessment** for 4-6 weeks after you begin remediation. This gives you a Before/After comparison that demonstrates measurable progress.

5. **Consider continuous monitoring** if your organization wants to track CMDB health as an ongoing operational metric rather than a point-in-time assessment.

---

## Need Help?

If you run into issues during setup or want guidance on interpreting your results, contact your Avennorth representative or email support@avennorth.com.

For emergency support during an active assessment, call the Avennorth support line at the number provided during onboarding.
