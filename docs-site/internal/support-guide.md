---
outline: deep
---

# Support and Troubleshooting Guide

Guide for diagnosing and resolving issues with the Bearing platform.

## Checking System Health

The health endpoint provides a quick check that the API server is running and responsive.

```bash
curl -s http://localhost:8080/api/v1/health | python -m json.tool
```

Expected response:

```json
{
  "status": "healthy",
  "version": "0.1.0"
}
```

## Checking Logs

Bearing uses structured logging via Python's `logging` module, output to uvicorn stdout with timestamps.

```bash
# If running with Docker Compose
docker compose logs -f bearing

# If running directly
uvicorn bearing.main:app --host 0.0.0.0 --port 8080 2>&1 | tee bearing.log
```

Log levels: `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`. Set the log level via the `LOG_LEVEL` environment variable:

```bash
export LOG_LEVEL=DEBUG
```

## Running Diagnostics

### Run the test suite

```bash
make test
```

Or directly with pytest:

```bash
python -m pytest tests/ -v
```

### Check ServiceNow connectivity

```bash
# Basic connectivity check
curl -s -o /dev/null -w "%{http_code}" \
  https://YOUR_INSTANCE.service-now.com/api/now/table/sys_properties?sysparm_limit=1 \
  -u "admin:password"

# Expected: 200
```

### Check Pathfinder webhook endpoint

```bash
curl -s -X POST http://localhost:8080/api/v1/webhooks/pathfinder \
  -H "Content-Type: application/json" \
  -H "X-Bearing-API-Key: YOUR_API_KEY" \
  -d '{"schema_version": "1.0", "pathfinder_instance_id": "test", "ci_confidence_records": []}' \
  | python -m json.tool
```

## Common Errors and Resolutions

### Connection Refused (ECONNREFUSED)

**Cause:** The Bearing API server is not running or is listening on a different port.

**Resolution:**
1. Verify the server is running: `docker compose ps` or `ps aux | grep uvicorn`
2. Check the configured port: `echo $BEARING_PORT` (default: 8080)
3. Restart the service: `docker compose up -d` or `make run`

### 401 Unauthorized

**Cause:** Invalid or missing API key for webhook endpoints, or invalid ServiceNow credentials.

**Resolution:**
1. For webhook endpoints, verify the `X-Bearing-API-Key` header matches the configured `API_KEY` environment variable
2. For ServiceNow connections, verify credentials are correct and the account is not locked
3. Check if OAuth tokens have expired and need refresh

### 403 Forbidden

**Cause:** The ServiceNow user account does not have sufficient permissions to query the requested tables.

**Resolution:**
1. Verify the ServiceNow user has the `itil`, `cmdb_read`, or equivalent roles
2. Check ACL restrictions on the specific tables being queried
3. Contact the ServiceNow administrator to grant appropriate access

### 404 Table Not Found

**Cause:** The requested ServiceNow table does not exist on the target instance. This typically occurs when querying tables from licensed plugins that are not installed.

**Resolution:**
1. Verify the table exists: check System Definition > Tables in ServiceNow
2. Confirm the required plugin is activated (e.g., CMDB, ITSM, ITAM)
3. The assessment engine handles missing tables gracefully -- the corresponding dimension will score as N/A

### 429 Rate Limited

**Cause:** Too many API requests to ServiceNow in a short period.

**Resolution:**
1. Increase the request delay: `export SN_REQUEST_DELAY=0.5`
2. Run assessments during off-peak hours
3. Request a rate limit increase from the ServiceNow administrator
4. See [Workarounds - Rate Limiting](./workarounds#rate-limiting) for details

### 500 Internal Server Error

**Cause:** Unhandled exception in the Bearing API server.

**Resolution:**
1. Check the server logs for the full stack trace: `docker compose logs bearing`
2. Look for the `assessment_id` and timestamp in the error
3. If the error is reproducible, file a bug with the information listed below

## How to File a Bug

When reporting a bug, include the following information:

1. **Assessment ID** -- the UUID of the assessment that triggered the error
2. **Timestamp** -- when the error occurred (include timezone)
3. **Error message** -- the full error message or stack trace from logs
4. **ServiceNow version** -- the version of the target ServiceNow instance
5. **Steps to reproduce** -- what actions led to the error
6. **Expected behavior** -- what should have happened
7. **Actual behavior** -- what actually happened

File bugs in the Bearing GitHub repository issue tracker with the `bug` label.

## Escalation Matrix

| Level | Scope | Action |
|-------|-------|--------|
| **L1** | Basic troubleshooting | Check this documentation and the [Known Issues](./known-issues) page. Review FAQ. Verify configuration. |
| **L2** | Log analysis and diagnostics | Review server logs for errors. Check ServiceNow connectivity. Reproduce the issue. Review [Workarounds](./workarounds). |
| **L3** | Engineering escalation | File a GitHub issue with full diagnostic information. Tag the engineering team for investigation. |

## Contact Information

| Role | Contact |
|------|---------|
| Engineering Lead | *TBD* |
| Platform Support | *TBD* |
| ServiceNow SME | *TBD* |
| Product Owner | *TBD* |
