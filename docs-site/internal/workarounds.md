---
outline: deep
---

# Workarounds

Workarounds for common issues encountered when running Bearing. These are temporary solutions until permanent fixes are implemented.

## ServiceNow Timeout

**Problem:** Large ServiceNow queries (e.g., fetching all CIs from a large instance) may time out with the default 60-second client timeout.

**Workaround:** Increase the client timeout to 120 seconds by setting the `SN_TIMEOUT` environment variable:

```bash
export SN_TIMEOUT=120
```

Or in your `.env` file:

```
SN_TIMEOUT=120
```

## OAuth Token Refresh Failure

**Problem:** OAuth token refresh may fail if the refresh token has expired or the ServiceNow instance has revoked the grant.

**Workaround:** The client automatically falls back to the password grant flow when a refresh fails. Ensure that both OAuth credentials and basic auth credentials are configured in the instance connection. If the fallback also fails, re-authenticate by creating a new instance connection.

## Missing Fields in CI Data

**Problem:** Some CIs returned from ServiceNow may have empty or null values for fields that the scorers expect.

**Workaround:** No action needed. All dimension scorers handle empty/null fields gracefully by treating unpopulated fields as "not populated" and scoring accordingly. Missing fields will generate findings but will not cause errors.

## Rate Limiting

**Problem:** ServiceNow returns HTTP 429 (Too Many Requests) during assessment scans, especially on large instances.

**Workaround:** The built-in pagination includes a 0.1-second delay between requests. If you are still hitting rate limits, increase the delay:

```bash
export SN_REQUEST_DELAY=0.5
```

For very large instances, consider running assessments during off-peak hours or requesting a rate limit increase from the ServiceNow administrator.

## Report Generation Memory

**Problem:** Large assessments with 10K+ findings may cause high memory usage during PDF/DOCX report generation.

**Workaround:** Increase the container memory limit if running in Docker:

```yaml
services:
  bearing:
    build: .
    deploy:
      resources:
        limits:
          memory: 2G
```

If running outside Docker, ensure the host has at least 2GB of available memory for large report generation jobs.

## Stale Pathfinder Data

**Problem:** The Pathfinder confidence store does not expire records. Over time, confidence data may become stale and no longer reflect current infrastructure state.

**Workaround:** Restart the Bearing application to clear the confidence store, then re-ingest fresh data from Pathfinder. A TTL-based expiration is planned for a future release.

```bash
# Restart the service to clear in-memory stores
docker compose restart bearing
```

## Port Conflicts

**Problem:** Default ports may conflict with other services running on the same machine.

**Workaround:** All ports are configurable via environment variables and Makefile targets:

```bash
# API server (default: 8080)
export BEARING_PORT=9090

# Prototype dev server (default: 4201)
export PROTO_PORT=4202

# Internal docs site (default: 5173)
export DOCS_INTERNAL_PORT=5174

# Customer docs site (default: 5174)
export DOCS_CUSTOMER_PORT=5175
```

Or via Docker Compose:

```bash
BEARING_PORT=9090 docker compose up
```
