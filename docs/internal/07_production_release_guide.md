# Bearing -- Production Release Guide

> **Internal Avennorth Document** -- Not for customer distribution.
> Last updated: 2026-03-29

---

## Overview

This document covers taking Bearing from its current scaffold state to production readiness. The codebase builds cleanly (102 source files, 28 routes, 0 TypeScript errors) but needs testing, CI/CD, authentication, environment hardening, and production deployment.

**Current state:**
- Next.js 16 + React 18 + TypeScript + Tailwind CSS
- tRPC with 5 routers (assessments, findings, pathfinder, sow, benchmarks)
- Supabase backend with 10 tables, RLS policies, and seed data
- Scoring engine, export parser, report generators, and SOW builder implemented
- AES-256-GCM encryption for stored credentials
- No tests, no CI/CD, no auth pages, hardcoded demo org_id in upload route

**Target state:**
- Authenticated multi-tenant application
- Automated test suite (unit, integration, E2E)
- CI/CD pipeline with type checking, linting, testing, and deployment
- Hardened for production traffic with monitoring and alerting

---

## Pre-Production Checklist

### 1. Supabase Project Setup

Step-by-step:

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose a region close to your primary user base (US East recommended for US customers)
3. Set a strong database password and save it in your password manager
4. Wait for the project to finish provisioning (usually 1-2 minutes)

**Run the migration:**

5. Open the Supabase Dashboard, go to **SQL Editor**
6. Copy the full contents of `supabase/migrations/00001_initial_schema.sql`
7. Paste into the SQL Editor and click **Run**
8. This creates all 10 tables, RLS policies, indexes, and the `pgcrypto` extension

**Run the seed data:**

9. Open a new query in the SQL Editor
10. Copy the full contents of `supabase/seed.sql`
11. Paste and click **Run**
12. This inserts 12 remediation patterns with SOW template language and 12 core platform scan rules with query configs

**Verify the setup:**

13. Go to **Table Editor** and confirm all 10 tables exist:
    - `organizations`
    - `users`
    - `instance_connections`
    - `assessments`
    - `findings`
    - `remediation_patterns`
    - `scan_rules`
    - `benchmark_data`
    - `pathfinder_confidence`
    - `generated_sows`

14. For each org-scoped table, verify the lock icon is visible (RLS enabled):
    - `users`
    - `instance_connections`
    - `assessments`
    - `findings`
    - `pathfinder_confidence`
    - `generated_sows`

15. Get your credentials from **Settings > API**:
    - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
    - **anon/public key** (starts with `eyJ...`)
    - **service_role key** (starts with `eyJ...` -- keep this secret)

**Create test data:**

16. In the SQL Editor, create a test organization:
    ```sql
    INSERT INTO organizations (name, slug, brand_config, rate_card)
    VALUES (
      'Avennorth',
      'avennorth',
      '{"logo_url": "", "primary_color": "#CCFF00", "secondary_color": "#1A1A2E"}',
      '{"roles": [{"name": "Architect", "hourlyRate": 275}, {"name": "Developer", "hourlyRate": 225}, {"name": "Admin", "hourlyRate": 200}], "defaultEngagementType": "time_and_materials", "blendedRate": 233}'
    );
    ```

17. Create a test user linked to the org:
    ```sql
    INSERT INTO users (org_id, email, name, role)
    VALUES (
      (SELECT id FROM organizations WHERE slug = 'avennorth'),
      'engineer@avennorth.com',
      'Test Engineer',
      'admin'
    );
    ```

---

### 2. Environment Configuration

Copy the example file and fill in all values:

```bash
cp .env.example .env.local
```

Fill in each variable:

| Variable | How to Get It |
|----------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard > Settings > API > Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard > Settings > API > anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard > Settings > API > service_role key |
| `NEXTAUTH_SECRET` | Generate: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3000` for dev |
| `ENCRYPTION_KEY` | Generate: `openssl rand -hex 32` (produces 64 hex chars = 32 bytes) |
| `PATHFINDER_WEBHOOK_SECRET` | Generate: `openssl rand -base64 32` (share with Pathfinder team) |
| `REPORTS_STORAGE_BUCKET` | `bearing-reports` (create this bucket in Supabase Storage) |

Feature flags -- leave disabled until the relevant systems are ready:

```env
ENABLE_PATHFINDER_INTEGRATION=false
ENABLE_BENCHMARKING=false
ENABLE_CONTINUOUS_MONITORING=false
```

**Verify your setup:**

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. If you see the app load without console errors referencing missing env vars, the configuration is correct.

---

### 3. Authentication Setup

The current codebase has no auth pages and uses a hardcoded demo `org_id` in the upload API route. This section covers what needs to be built.

#### 3a. Enable Supabase Auth

1. In the Supabase Dashboard, go to **Authentication > Providers**
2. Enable **Email/Password** (minimum for development)
3. For enterprise customers, also enable:
   - **Google** (requires Google Cloud Console OAuth credentials)
   - **Microsoft** (requires Azure AD app registration)

#### 3b. Build Login and Signup Pages

Create the following files:

- `src/app/(auth)/login/page.tsx` -- Login form with email/password and OAuth buttons
- `src/app/(auth)/signup/page.tsx` -- Signup form (may be admin-only for multi-tenant)
- `src/app/(auth)/layout.tsx` -- Auth layout (no sidebar, centered card)

These pages should use `@supabase/ssr` to call `supabase.auth.signInWithPassword()` or `supabase.auth.signInWithOAuth()`.

#### 3c. Add Route Protection Middleware

Create `src/middleware.ts` at the project root:

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/signup') &&
    !request.nextUrl.pathname.startsWith('/api/webhooks')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)',
  ],
};
```

#### 3d. Wire Auth into tRPC Context

Update `src/server/trpc/context.ts` to:

1. Read the authenticated user from the Supabase session
2. Look up the user's `org_id` from the `users` table
3. Set `app.current_org_id` in the Supabase session for RLS
4. Pass the `org_id` into the tRPC context

#### 3e. Remove Hardcoded Demo org_id

Search the codebase for any hardcoded org_id values. At minimum, the upload route at `src/app/api/export/upload/route.ts` has a hardcoded demo org_id that must be replaced with the authenticated user's org_id from the session.

```bash
# Find all hardcoded org_id references
grep -rn "org_id" src/app/api/ --include="*.ts"
```

---

### 4. Testing Strategy

#### 4a. Unit Test Setup

Install the test toolchain:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Create `vitest.config.ts` at the project root:

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

Create `tests/setup.ts`:

```typescript
import '@testing-library/jest-dom';
```

Add the test script to `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

#### 4b. Priority Unit Tests

Write tests in this order. Each test targets a critical business logic module.

**1. `src/server/scoring/composite-scorer.test.ts`** -- Scoring formula correctness

```typescript
import { describe, it, expect } from 'vitest';
import { computeCompositeScore } from './composite-scorer';

describe('computeCompositeScore', () => {
  it('returns max score for critical/XS/5', () => {
    const score = computeCompositeScore('critical', 'XS', 5);
    // (4 * 0.4) + (5 * 0.3) + (5 * 0.3) = 1.6 + 1.5 + 1.5 = 4.6
    expect(score).toBe(4.6);
  });

  it('returns min score for low/XL/1', () => {
    const score = computeCompositeScore('low', 'XL', 1);
    // (1 * 0.4) + (1 * 0.3) + (1 * 0.3) = 0.4 + 0.3 + 0.3 = 1.0
    expect(score).toBe(1);
  });

  it('ranks quick wins higher than slow fixes at same severity', () => {
    const quickFix = computeCompositeScore('high', 'XS', 3);
    const slowFix = computeCompositeScore('high', 'XL', 3);
    expect(quickFix).toBeGreaterThan(slowFix);
  });

  it('handles medium severity with medium effort', () => {
    const score = computeCompositeScore('medium', 'M', 3);
    // (2 * 0.4) + (3 * 0.3) + (3 * 0.3) = 0.8 + 0.9 + 0.9 = 2.6
    expect(score).toBe(2.6);
  });

  it('returns a value between 1.0 and 4.6 inclusive', () => {
    const severities = ['critical', 'high', 'medium', 'low'] as const;
    const efforts = ['XS', 'S', 'M', 'L', 'XL'] as const;
    for (const sev of severities) {
      for (const eff of efforts) {
        for (let risk = 1; risk <= 5; risk++) {
          const score = computeCompositeScore(sev, eff, risk);
          expect(score).toBeGreaterThanOrEqual(1.0);
          expect(score).toBeLessThanOrEqual(4.6);
        }
      }
    }
  });
});
```

**2. `src/server/scoring/health-index.test.ts`** -- Health score computation

Test cases:
- Empty findings array returns 100
- Single critical finding reduces score by 5 per affected count
- Score never goes below 0
- Mixed severity findings produce expected result

**3. `src/server/reporting/revenue-calculator.test.ts`** -- Revenue calculations

Test cases:
- Correct total hours calculation with affected counts
- Blended rate applied correctly
- Role-specific rates averaged when no blended rate
- Empty findings produce zero revenue

**4. `src/server/scanner/export-parser.test.ts`** -- Zod validation

Test cases:
- Valid export payload passes validation
- Missing required fields fail validation
- Malformed JSON returns proper error
- Extra fields are stripped or ignored

**5. `src/server/scanner/modules/core/scripting-debt.test.ts`** -- Rule evaluation

Test cases:
- Script with hardcoded sys_id detected
- Script with only its own sys_id is not flagged
- Known system sys_ids are excluded
- Multiple findings from a single script counted correctly

**6. `src/server/scanner/engine.test.ts`** -- Full scan pipeline

Test cases:
- End-to-end: parsed export produces scored findings
- Empty export produces no findings and health score of 100
- Module filtering works (only enabled modules scanned)

**7. `src/server/scoring/pathfinder-fusion.test.ts`** -- Fusion rules

Test cases:
- CMDB active + Pathfinder idle = critical finding
- CMDB retired + Pathfinder active = high finding
- Class mismatch with high confidence triggers finding
- Class mismatch with low confidence does not trigger

**8. `src/lib/encryption.test.ts`** -- Encrypt/decrypt round-trip

Test cases:
- Round-trip: encrypt then decrypt returns original plaintext
- Different plaintexts produce different ciphertexts
- Tampered ciphertext throws on decrypt
- Missing ENCRYPTION_KEY throws descriptive error

#### 4c. Integration Tests

Create a test fixture at `tests/fixtures/sample-export.json` with realistic ServiceNow export data covering at least 10 findings across 3+ modules.

Integration test priorities:

1. **Export upload API route** -- POST a sample JSON payload to `/api/export/upload` and verify:
   - HTTP 200 response
   - Assessment created in the database
   - Findings persisted with correct scores
   - Health score computed and stored

2. **tRPC procedures** -- Test against a test Supabase instance:
   - `assessments.getById` returns assessment with computed fields
   - `findings.list` filters by module and severity
   - `sow.generate` produces a valid document URL

For integration tests, use a separate Supabase project (or the local Supabase CLI) to avoid polluting development data.

#### 4d. E2E Tests

Install Playwright:

```bash
npm install -D @playwright/test
npx playwright install
```

Create `playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

Priority E2E tests:

1. **Upload flow**: Navigate to `/assessments/new`, upload a test JSON file, verify redirect to assessment dashboard showing health score and findings
2. **Report generation**: From an assessment page, click generate consultant report, verify DOCX download completes
3. **SOW builder**: Navigate to SOW tab, select findings, configure engagement type and rates, generate SOW, verify download
4. **Connection flow** (Phase 3): Add a new ServiceNow connection, enter credentials, test connection, verify status changes to active

---

### 5. CI/CD Pipeline

#### 5a. GitHub Actions Workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test
    env:
      ENCRYPTION_KEY: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa

  build:
    runs-on: ubuntu-latest
    needs: [lint-and-typecheck, test]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
    env:
      NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
      SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
      NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}
      NEXTAUTH_URL: https://bearing.avennorth.com
      ENCRYPTION_KEY: ${{ secrets.ENCRYPTION_KEY }}

  e2e:
    runs-on: ubuntu-latest
    needs: [build]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
    env:
      NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
      SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
      NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}
      ENCRYPTION_KEY: ${{ secrets.ENCRYPTION_KEY }}
```

#### 5b. GitHub Secrets Setup

In the GitHub repo settings, go to **Settings > Secrets and variables > Actions** and add:

| Secret | Value |
|--------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your staging/production Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `NEXTAUTH_SECRET` | Generated secret for production |
| `ENCRYPTION_KEY` | Generated 64-char hex key for production |

#### 5c. Vercel Deployment

1. Go to [vercel.com](https://vercel.com) and create a new project
2. Import the GitHub repository `blmuffley/Bearing`
3. Vercel auto-detects Next.js -- accept the defaults
4. In **Settings > Environment Variables**, add all variables from the table above
5. Set `NEXTAUTH_URL` to your production domain (e.g., `https://bearing.avennorth.com`)
6. Enable **Preview Deployments** for pull requests (this is on by default)
7. Set the production branch to `main`

Each push to `main` triggers: CI checks in GitHub Actions, then Vercel builds and deploys automatically.

---

### 6. Security Hardening

Work through each item. Check the box when complete.

- [ ] **Input validation**: Verify all API routes validate input with Zod schemas. Check every `route.ts` file under `src/app/api/` and every tRPC procedure in `src/server/trpc/routers/`.
- [ ] **No client-side secrets**: Verify no secret values appear in files under `src/app/` or `src/components/`. Only `NEXT_PUBLIC_*` variables should be referenced in client code. Run: `grep -rn "SERVICE_ROLE\|ENCRYPTION_KEY\|WEBHOOK_SECRET" src/app/ src/components/`
- [ ] **Strong encryption key**: Verify `ENCRYPTION_KEY` is exactly 64 hex characters (32 bytes). The `src/lib/encryption.ts` module validates this at runtime but verify at deploy time too.
- [ ] **CORS settings**: Review `next.config.ts` and verify `headers()` restricts `Access-Control-Allow-Origin` to your production domain, not `*`.
- [ ] **Rate limiting on public routes**: Add rate limiting to:
  - `src/app/api/webhooks/pathfinder/route.ts` (webhook endpoint)
  - `src/app/api/export/upload/route.ts` (file upload endpoint)
  - Recommended: Use Vercel's built-in rate limiting or `@upstash/ratelimit` with Redis.
- [ ] **Request size limits**: Add request body size limits for file uploads. In the upload route, reject payloads larger than 50MB (configurable). Next.js `route.ts` files can export a `config` with `maxDuration` but body size limits need explicit checking.
- [ ] **Org-scoped queries**: Audit every Supabase query in the codebase to verify it includes `org_id` filtering. Run: `grep -rn "from(" src/server/ --include="*.ts"` and verify each one.
- [ ] **Minimize service role usage**: The `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS. Audit where it is used and restrict to only routes that truly need it (e.g., webhook ingestion, background jobs). All user-facing queries should use the anon key with RLS.
- [ ] **CSP headers**: Add Content Security Policy headers in `next.config.ts`:
  ```typescript
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co;",
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  }
  ```
- [ ] **Vercel WAF**: If available on your Vercel plan, enable the Web Application Firewall in the project security settings.

---

### 7. Production Database

- [ ] **Separate environments**: Create three Supabase projects:
  - `bearing-dev` -- for local development and experimentation
  - `bearing-staging` -- for CI and pre-production testing
  - `bearing-prod` -- production only

- [ ] **Run migrations on all environments**: Execute `supabase/migrations/00001_initial_schema.sql` in each project's SQL Editor.

- [ ] **Seed production**: Run `supabase/seed.sql` on staging and production. This inserts the 12 remediation patterns and 12 scan rules that form the product's rule library.

- [ ] **Verify RLS policies**: In the production Supabase Dashboard, go to Table Editor and confirm the lock icon is visible on all org-scoped tables. Then test by running a query without setting `app.current_org_id` -- it should return zero rows.

- [ ] **Enable backups**: In Supabase Dashboard > Settings > Database, verify that Point-in-Time Recovery is enabled (available on Pro plan and above). For the free tier, set up a daily pg_dump via a scheduled job or Supabase's built-in backup.

- [ ] **Connection pooling**: Enable PgBouncer in Supabase Dashboard > Settings > Database > Connection Pooling. Use the pooled connection string for the application. This is critical for serverless environments like Vercel where each request may open a new connection.

- [ ] **Database monitoring**: Set up alerts in Supabase Dashboard for:
  - Database size approaching limits
  - Slow queries (>1 second)
  - Connection count approaching pool limits
  - Auth failure spikes

---

### 8. Monitoring and Observability

#### Vercel Analytics

1. In the Vercel project settings, go to **Analytics** and enable it
2. This gives you Web Vitals, page load times, and traffic data out of the box

#### Error Tracking with Sentry

Install Sentry:

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

This creates:
- `sentry.client.config.ts` -- client-side error tracking
- `sentry.server.config.ts` -- server-side error tracking
- `sentry.edge.config.ts` -- edge runtime error tracking
- `next.config.ts` is wrapped with `withSentryConfig`

Configure the DSN in environment variables:

```env
NEXT_PUBLIC_SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
SENTRY_AUTH_TOKEN=your-auth-token
```

In the Sentry dashboard:
- Set up alerts for error rate spikes
- Configure release tracking to correlate errors with deployments
- Set the environment tag to `production` or `staging`

#### Structured Logging

Add structured logging for scan operations. At minimum, log:

- Scan start/end with duration
- Number of findings by severity
- Health score computed
- Any errors during scan or scoring
- Webhook receive events
- Report generation events

Use `console.log` with JSON format for Vercel log parsing:

```typescript
console.log(JSON.stringify({
  event: 'scan_complete',
  assessmentId: assessment.id,
  orgId: orgId,
  duration_ms: Date.now() - startTime,
  findingCount: findings.length,
  healthScore: healthScore,
}));
```

#### Uptime Monitoring

Set up uptime monitoring for the webhook endpoint (`/api/webhooks/pathfinder`). Options:
- **Vercel Cron** with a health check endpoint
- **UptimeRobot** (free tier supports 50 monitors)
- **Better Stack** (formerly BetterUptime)

---

### 9. Performance Optimization

- [ ] **Dashboard query caching**: The assessment dashboard page makes multiple database queries (assessment, findings, scores). Use Next.js `unstable_cache` or React Server Components with `revalidate` to cache these for 60 seconds. Assessment data rarely changes after the scan completes.

- [ ] **Paginate FindingsTable server-side**: The current `FindingsTable` component loads all findings at once. For large assessments (1000+ findings), this will be slow. Implement server-side pagination in the `findings.list` tRPC procedure with `limit` and `offset` parameters.

- [ ] **Move live scans to background jobs**: Live scans are currently synchronous in the API route. Production instances may have 100K+ records and scans can take minutes. This will cause Vercel function timeouts (default 10 seconds, max 60 seconds on Pro). Move scan execution to a background job system. See section 10.

- [ ] **Add scan progress updates**: When scans are backgrounded, add Server-Sent Events (SSE) or polling to show progress on the UI. Create an endpoint at `/api/assessments/[id]/status` that returns the current scan phase and percentage.

- [ ] **Optimize DOCX generation**: The `docx` library generates documents in memory. For reports with 500+ findings, memory usage can spike. Consider:
  - Streaming the document to a buffer in chunks
  - Limiting the findings included per report (top 100 by composite score, with summary counts for the rest)
  - Generating reports asynchronously and storing in Supabase Storage

---

### 10. Background Jobs

The following operations are currently synchronous but should be moved to a job queue for production:

| Job | Current Location | Why It Needs a Queue |
|-----|-----------------|---------------------|
| Live scan execution | API route handler | Can take minutes for large instances; will timeout on Vercel |
| Assessment time-decay | Not implemented | Needs daily cron to reduce visibility on aging assessments |
| Benchmark aggregation | Not implemented | Should run after each assessment completes |
| Pathfinder confidence processing | Webhook handler | Large payloads with thousands of CIs could timeout |
| Compass pipeline sync | Not implemented | Should fire after SOW status changes |

**Recommended: Inngest** (serverless, Vercel-compatible, no infrastructure to manage)

Install:

```bash
npm install inngest
```

Create the Inngest client at `src/lib/inngest/client.ts`:

```typescript
import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'bearing',
  schemas: new EventSchemas(),
});
```

Create job functions at `src/lib/inngest/functions/`:

```typescript
// src/lib/inngest/functions/run-scan.ts
import { inngest } from '../client';

export const runScan = inngest.createFunction(
  { id: 'run-live-scan', concurrency: { limit: 5 } },
  { event: 'scan/requested' },
  async ({ event, step }) => {
    const { assessmentId, orgId, instanceConnectionId } = event.data;

    await step.run('connect-to-instance', async () => {
      // Establish connection, verify credentials
    });

    await step.run('execute-scan-rules', async () => {
      // Run each module's rules against the instance
    });

    await step.run('compute-scores', async () => {
      // Calculate composite scores and health index
    });

    await step.run('finalize-assessment', async () => {
      // Update assessment status to 'complete'
    });
  },
);
```

Create the Inngest API route at `src/app/api/inngest/route.ts`:

```typescript
import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { runScan } from '@/lib/inngest/functions/run-scan';
// Import other functions...

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [runScan],
});
```

---

### 11. Pre-Launch Testing Checklist

Complete every item before going live. Each tests a real user workflow.

- [ ] **Upload a real ServiceNow export**: Use a sanitized export JSON from a real (or realistic dev) instance. Navigate to `/assessments/new`, upload it, and verify the dashboard shows findings.
- [ ] **Verify health scores are reasonable**: The health score should not always be 0 or 100. A typical instance with moderate debt should score between 40-80. If all assessments score 100, the scan rules are not matching. If all score 0, the penalty weights are too aggressive.
- [ ] **Generate all 3 document types**:
  - Consultant report (includes pricing and margin analysis)
  - Customer report (white-labeled, no pricing)
  - SOW (statement of work with selected findings)
- [ ] **Open generated DOCX files in Word**: Verify formatting, tables render correctly, branding (logo, colors) appears as configured, and page breaks are in the right places.
- [ ] **Test the SOW builder wizard end-to-end**: Select findings from the findings table, configure engagement type (T&M vs. fixed fee), set hourly rates, generate the SOW, download and review.
- [ ] **Test connection flow with a real ServiceNow dev instance** (Phase 3): Add a connection, enter OAuth or basic auth credentials, test the connection, verify it transitions to "active" status.
- [ ] **Verify Pathfinder webhook accepts a test payload**: Send a POST request to `/api/webhooks/pathfinder` with the `X-Bearing-API-Key` header and a valid confidence feed payload. Verify it returns 200 and data appears in the `pathfinder_confidence` table.
  ```bash
  curl -X POST https://your-domain.com/api/webhooks/pathfinder \
    -H "X-Bearing-API-Key: your-webhook-secret" \
    -H "Content-Type: application/json" \
    -d '{"schema_version":"1.0","pathfinder_instance_id":"test","servicenow_instance_url":"https://dev.service-now.com","observation_window_hours":24,"generated_at":"2026-03-29T00:00:00Z","ci_confidence_records":[],"coverage_summary":{"total_monitored_hosts":0,"active_cis":0,"idle_cis":0,"deprecated_cis":0,"unknown_cis":0,"monitored_subnets":[],"unmonitored_subnets_detected":[]}}'
  ```
- [ ] **Verify multi-tenancy**: Create two separate organizations with different users. Upload assessments for each. Log in as each user and confirm they can only see their own organization's data. Attempt to access the other org's assessment by ID -- it should return 404 or empty.
- [ ] **Test with a large export (1000+ records)**: Verify the upload completes within a reasonable time (under 30 seconds), the dashboard loads without freezing, and the findings table remains responsive with pagination.
- [ ] **Verify mobile/responsive layout**: Open the dashboard on a mobile viewport (375px width). The sidebar should collapse, tables should scroll horizontally, and the health gauge should remain readable.
- [ ] **Cross-browser testing**: Test in Chrome, Firefox, Safari, and Edge. Verify layout, upload flow, and DOCX download work in all.

---

### 12. Release Checklist

Final gate before production deployment. Every item must be checked.

**Code Quality:**
- [ ] All unit tests passing (`npm test`)
- [ ] All E2E tests passing (`npx playwright test`)
- [ ] TypeScript compiles with zero errors (`npx tsc --noEmit`)
- [ ] ESLint passes with no errors (`npm run lint`)
- [ ] Next.js builds successfully (`npm run build`)

**Infrastructure:**
- [ ] Environment variables set in Vercel for production
- [ ] Supabase production project created and provisioned
- [ ] Migration SQL executed on production database
- [ ] Seed SQL executed on production database (scan rules + remediation patterns)
- [ ] RLS policies verified on production (query without org_id returns zero rows)
- [ ] Connection pooling enabled on production Supabase
- [ ] Supabase Storage bucket created for reports

**Security:**
- [ ] Custom domain configured in Vercel (e.g., `bearing.avennorth.com`)
- [ ] SSL certificate active (automatic with Vercel)
- [ ] Rate limiting enabled on public endpoints (webhook, upload)
- [ ] CSP headers configured in `next.config.ts`
- [ ] No secrets in client-side code

**Monitoring:**
- [ ] Error tracking (Sentry) configured and receiving test events
- [ ] Vercel Analytics enabled
- [ ] Uptime monitoring active on the webhook endpoint
- [ ] Database backup schedule confirmed

**Documentation:**
- [ ] Webhook endpoint URL and API key shared with Pathfinder team
- [ ] Runbook documented for common incidents (see below)

#### Production Runbook (Common Incidents)

| Incident | Diagnosis | Resolution |
|----------|-----------|------------|
| "relation does not exist" errors | Migration not run on this environment | Run `00001_initial_schema.sql` in Supabase SQL Editor |
| "No rows returned" on scan | Seed data missing | Run `seed.sql` in Supabase SQL Editor |
| 401 errors on tRPC calls | Supabase keys wrong or expired | Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel env vars |
| 401 on Pathfinder webhook | API key mismatch | Verify `PATHFINDER_WEBHOOK_SECRET` matches what Pathfinder sends in `X-Bearing-API-Key` |
| Upload fails with "Failed to persist" | Service role key wrong | Verify `SUPABASE_SERVICE_ROLE_KEY` in Vercel env vars |
| Function timeout on scan | Scan running synchronously in API route | Move to background job (see section 10); increase Vercel function timeout as interim fix |
| Health scores always 0 | Penalty weights too high or all findings critical | Check scan rules and health-index.ts penalty configuration |
| DOCX download fails | Memory limit on large reports | Reduce findings per report or increase Vercel function memory |
| RLS blocking all queries | `app.current_org_id` not set in session | Check tRPC context is setting the Supabase session variable |

---

### 13. Post-Launch

First 48 hours:

- [ ] Monitor Sentry for error rate spikes -- expect some edge cases with real customer data
- [ ] Watch Vercel function logs for timeout warnings
- [ ] Monitor Supabase dashboard for slow queries or connection pool exhaustion
- [ ] Verify at least one assessment upload from a real customer completes end-to-end

First 2 weeks:

- [ ] Collect calibration data from first completed engagements -- compare actual hours spent vs. Bearing estimates
- [ ] Review scan rule accuracy -- are findings reasonable? Are false positives flagged?
- [ ] Adjust health score penalty weights if scores cluster too high or too low
- [ ] Verify benchmark aggregation after 10+ assessments (enable `ENABLE_BENCHMARKING` flag)

Ongoing:

- [ ] Plan Phase 2+ module expansion (HRSD, SPM, SecOps, GRC, CSM -- scanner module stubs exist at `src/server/scanner/modules/`)
- [ ] Feed calibration data back into `remediation_patterns.calibration_factor`
- [ ] Build continuous monitoring (recurring scans) once the background job infrastructure is in place
- [ ] Evaluate Compass integration readiness for SOW pipeline sync

---

## Quick Start for Engineers

The fastest path to a running dev environment:

```bash
git clone https://github.com/blmuffley/Bearing.git
cd Bearing
cp .env.example .env.local
# Fill in Supabase credentials in .env.local (see section 2)
npm install
npm run dev
```

Then:

1. Create a Supabase project and get your credentials (section 1, steps 1-5)
2. Run the migration SQL in Supabase SQL Editor (section 1, steps 6-8)
3. Run the seed SQL in Supabase SQL Editor (section 1, steps 9-12)
4. Add your credentials to `.env.local` (section 2)
5. Open `http://localhost:3000`
6. Navigate to `/assessments/new`
7. Upload a test JSON export (ask the team for a sample or use `tests/fixtures/sample-export.json` once created)

**Key files to understand first:**

| File | Purpose |
|------|---------|
| `src/server/trpc/router.ts` | Main tRPC router -- 5 sub-routers (assessments, findings, pathfinder, sow, benchmarks) |
| `src/server/scanner/engine.ts` | Scan orchestrator -- runs rules against parsed exports |
| `src/server/scanner/export-parser.ts` | Parses and validates uploaded JSON exports |
| `src/server/scoring/composite-scorer.ts` | Core scoring formula: `(severity * 0.4) + (effort_inverse * 0.3) + (risk * 0.3)` |
| `src/server/scoring/health-index.ts` | Aggregates findings into 0-100 health scores |
| `src/server/reporting/revenue-calculator.ts` | Applies rate cards to findings for revenue projections |
| `src/server/reporting/sow-generator.ts` | Generates DOCX statements of work |
| `src/lib/encryption.ts` | AES-256-GCM encryption for stored credentials |
| `supabase/migrations/00001_initial_schema.sql` | Complete database schema (10 tables, RLS, indexes) |
| `supabase/seed.sql` | 12 scan rules + 12 remediation patterns |
