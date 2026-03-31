# Getting Started with Bearing

## What is Bearing?
Bearing is a ServiceNow platform health assessment tool that helps you identify, prioritize, and plan remediation of technical debt in your clients' ServiceNow instances.

## What Bearing Does
- Scans ServiceNow instance configuration metadata
- Identifies technical debt across platform domains (Core, CMDB, ITSM, ITAM)
- Scores each finding by severity, effort, and risk
- Calculates a composite health score (0-100)
- Generates prioritized remediation backlogs
- Produces professional assessment reports
- Builds Statements of Work with scope, pricing, and timelines

## Getting Started

### Step 1: Create Your Organization
- Sign up at [URL]
- Set up your organization profile
- Invite team members

### Step 2: Configure Your Rate Card
- Navigate to Settings → Rate Card
- Set your blended hourly rate
- Add role-specific rates (Architect, Developer, Admin)
- Set your margin target

### Step 3: Run Your First Assessment

**Option A: Upload an Export** (Recommended for first-time use)
1. Obtain a sanitized JSON export from the ServiceNow instance
2. Navigate to Assessments → New Assessment
3. Select "Upload Export"
4. Drop your JSON file and enter the customer name
5. Click "Run Assessment"
6. View your results on the dashboard

**Option B: Connect Directly**
1. Navigate to Connections → New Connection
2. Choose authentication method (Basic Auth or OAuth 2.0)
3. Enter instance credentials
4. Test the connection
5. Save and run a scan

### Step 4: Review Results
- Health Score gauge shows overall instance health (0-100)
- Revenue summary shows total addressable remediation value
- Domain scores break down health by module
- Findings table lists every issue found, sortable by priority

### Step 5: Generate Reports
- **Internal Report**: Full assessment with pricing and margin analysis
- **Customer Report**: White-labeled, risk-focused, no pricing

### Step 6: Build a SOW
- Select findings to include
- Configure engagement type and rate card
- Review and generate a professional Statement of Work
