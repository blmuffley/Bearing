# ServiceNow Connection Guide

## Connection Methods

### Export Upload (Recommended for Getting Started)
Upload a sanitized JSON export from the ServiceNow instance. This is the simplest method and requires no direct API access.

**How to prepare an export:**
1. Contact the ServiceNow administrator
2. Request a configuration metadata export covering: business rules, script includes, UI policies, UI actions, update sets, ACLs, role assignments, CMDB CIs and relationships, incidents, changes, and hardware assets
3. The export should be in JSON format
4. Upload via Assessments → New Assessment → Upload Export

### Basic Authentication
Connect directly to the ServiceNow instance using username and password.

**Prerequisites:**
- ServiceNow user account with read access to configuration tables
- Recommended roles: `admin` or `itil` with additional read permissions

**Setup:**
1. Navigate to Connections → New Connection
2. Select "Basic Auth"
3. Enter the instance URL (e.g., https://yourinstance.service-now.com)
4. Enter credentials
5. Click "Test Connection" to verify
6. Save the connection

### OAuth 2.0 (Recommended for Production)
The most secure connection method using ServiceNow's OAuth provider.

**Prerequisites:**
- ServiceNow OAuth application registered in the instance
- Client ID and Client Secret from the OAuth application
- Redirect URI configured in the OAuth application

**Setup:**
1. In ServiceNow: Navigate to System OAuth → Application Registry
2. Create a new OAuth application
3. Note the Client ID and Client Secret
4. Set the Redirect URI to your Bearing instance callback URL
5. In Bearing: Navigate to Connections → New Connection
6. Select "OAuth 2.0"
7. Enter the details and click "Authorize"
8. Complete the OAuth flow in the ServiceNow login page

## Connection Security
- All credentials are encrypted at rest using AES-256-GCM
- OAuth tokens are refreshed automatically
- Connections can be disconnected at any time
- No customer data is stored permanently — only assessment metadata and findings

## Running a Live Scan
Once connected:
1. Navigate to the connection detail page
2. Click "Run New Scan"
3. The scan queries ServiceNow tables directly
4. Results appear on the assessment dashboard when complete
