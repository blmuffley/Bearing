# Bearing -- Deployment Guide

> **Internal Avennorth Document** -- Not for customer distribution.
> Last updated: 2026-03-29

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 18+ | LTS recommended |
| npm | 9+ | Ships with Node.js 18+ |
| Supabase account | -- | Free tier works for development |
| Vercel account | -- | Optional; for production deployment |
| Git | -- | For cloning the repository |

---

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/blmuffley/Bearing.git
cd Bearing
```

### 2. Create Environment File

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in the values (see Environment Variables section below).

### 3. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note the **Project URL** and **API keys** from Settings -> API
3. Note the **Database connection string** from Settings -> Database

### 4. Run Database Migration

1. Open the Supabase SQL Editor (Dashboard -> SQL Editor)
2. Copy the contents of `supabase/migrations/00001_initial_schema.sql`
3. Paste into the SQL Editor and click **Run**

This creates all 10 tables, RLS policies, and indexes.

### 5. Run Seed Data

1. In the Supabase SQL Editor, open a new query
2. Copy the contents of `supabase/seed.sql`
3. Paste and click **Run**

This inserts:
- 12 remediation patterns with SOW template language
- 12 core platform scan rules with query configs

### 6. Install Dependencies

```bash
npm install
```

### 7. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

---

## Environment Variables

### Required for Local Development

| Variable | Where to Find | Example |
|----------|---------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard -> Settings -> API -> Project URL | `https://abcdefgh.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard -> Settings -> API -> anon/public key | `eyJhbGciOiJIUzI1NiIs...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard -> Settings -> API -> service_role key | `eyJhbGciOiJIUzI1NiIs...` |
| `NEXTAUTH_SECRET` | Generate: `openssl rand -base64 32` | `K7x9...` |
| `NEXTAUTH_URL` | Your local dev URL | `http://localhost:3000` |

### Required for ServiceNow Integration (Phase 3+)

| Variable | Where to Find | Example |
|----------|---------------|---------|
| `SERVICENOW_CLIENT_ID` | ServiceNow instance -> System OAuth -> Application Registries | `abc123...` |
| `SERVICENOW_CLIENT_SECRET` | Same location as client ID | `def456...` |
| `SERVICENOW_REDIRECT_URI` | Must match registered redirect URI | `http://localhost:3000/api/auth/servicenow/callback` |

### Required for Pathfinder Integration (Phase 4+)

| Variable | Where to Find | Example |
|----------|---------------|---------|
| `PATHFINDER_WEBHOOK_SECRET` | Shared with Pathfinder team | `whsec_...` |

### Required for Production

| Variable | Where to Find | Example |
|----------|---------------|---------|
| `ENCRYPTION_KEY` | Generate: `openssl rand -hex 32` | `a1b2c3...` (64 hex chars) |
| `REPORTS_STORAGE_BUCKET` | Supabase Storage bucket name or S3 bucket | `bearing-reports` |
| `COMPASS_URL` | Compass deployment URL | `https://compass.avennorth.com` |
| `COMPASS_API_KEY` | Compass admin panel | `ck_live_...` |

### Feature Flags

| Variable | Default | When to Enable |
|----------|---------|----------------|
| `ENABLE_PATHFINDER_INTEGRATION` | `false` | When Pathfinder is deployed and sending data |
| `ENABLE_BENCHMARKING` | `false` | When 10+ assessments exist across orgs |
| `ENABLE_CONTINUOUS_MONITORING` | `false` | When recurring scan scheduler is ready |

### Full .env.local Template

```env
# Database
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# ServiceNow OAuth (Phase 3+)
SERVICENOW_CLIENT_ID=
SERVICENOW_CLIENT_SECRET=
SERVICENOW_REDIRECT_URI=

# Pathfinder Integration (Phase 4+)
PATHFINDER_WEBHOOK_SECRET=

# Encryption (production only)
ENCRYPTION_KEY=

# Document Generation
REPORTS_STORAGE_BUCKET=

# Compass Integration
COMPASS_URL=
COMPASS_API_KEY=

# Feature Flags
ENABLE_PATHFINDER_INTEGRATION=false
ENABLE_BENCHMARKING=false
ENABLE_CONTINUOUS_MONITORING=false
```

---

## Vercel Deployment

### 1. Connect Repository

1. Go to [vercel.com](https://vercel.com) and create a new project
2. Import the GitHub repository `blmuffley/Bearing`
3. Vercel auto-detects the Next.js framework

### 2. Set Environment Variables

In the Vercel project settings -> Environment Variables, add all variables from the section above. Make sure to:

- Set `NEXTAUTH_URL` to your production domain (e.g., `https://bearing.avennorth.com`)
- Use production Supabase project credentials (not dev)
- Generate a unique `NEXTAUTH_SECRET` for production
- Generate a unique `ENCRYPTION_KEY` for production

### 3. Deploy

Click **Deploy**. Vercel will:
1. Install dependencies (`npm install`)
2. Build the project (`npm run build`)
3. Deploy to the Vercel edge network

Subsequent pushes to `main` trigger automatic deployments.

### Build Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Production build |
| `npm run start` | Start production server locally |
| `npm run lint` | Run ESLint |

---

## Supabase Configuration

### Enable RLS on All Tables

RLS is enabled in the migration script for all tenant-scoped tables. Verify in the Supabase Dashboard:

1. Go to Table Editor
2. For each table listed below, confirm RLS is enabled (lock icon visible):
   - users
   - instance_connections
   - assessments
   - findings
   - pathfinder_confidence
   - generated_sows

### RLS Policies

Each tenant-scoped table has one policy created by the migration:

```sql
CREATE POLICY org_isolation ON {table_name}
  USING (org_id = current_setting('app.current_org_id')::uuid);
```

This ensures every query is automatically filtered to the authenticated user's organization.

**Important:** The `app.current_org_id` session variable must be set from the authenticated user's JWT before any database queries. This is handled by the tRPC context (`src/server/trpc/context.ts`).

### Tables Without RLS

These are global reference tables:
- `organizations` -- org_id IS the id; access controlled at application layer
- `scan_rules` -- shared rule library, read-only for all orgs
- `remediation_patterns` -- shared pattern library (calibration_factor updated globally)
- `benchmark_data` -- anonymized aggregate data

### Auth Providers

Configure in Supabase Dashboard -> Authentication -> Providers:

1. **Email/Password** -- Enable for development and basic setup
2. **Magic Link** -- Optional, for passwordless auth
3. **OAuth providers** -- Configure as needed (Google, Microsoft for enterprise SSO)

### Storage (for Generated Reports)

1. Go to Supabase Dashboard -> Storage
2. Create a bucket named to match your `REPORTS_STORAGE_BUCKET` environment variable
3. Set access policies to restrict to authenticated users within their org

---

## Post-Deployment Verification

After deploying, verify these endpoints work:

| Check | How to Test |
|-------|-------------|
| App loads | Visit the deployment URL |
| Supabase connection | Navigate to any authenticated page |
| Export upload | Upload a test JSON file at `/assessments/new` |
| Report generation | Generate a consultant or customer report from an assessment |
| Pathfinder webhook | `curl -X POST {url}/api/webhooks/pathfinder -H "X-Bearing-API-Key: {secret}" -H "Content-Type: application/json" -d '{...}'` |

---

## Troubleshooting

| Issue | Likely Cause | Fix |
|-------|-------------|-----|
| "relation does not exist" | Migration not run | Run `00001_initial_schema.sql` in Supabase SQL Editor |
| "No rows returned" on scan | Seed data not loaded | Run `seed.sql` in Supabase SQL Editor |
| 401 on tRPC calls | Missing or invalid Supabase keys | Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| 401 on Pathfinder webhook | Wrong API key | Check `PATHFINDER_WEBHOOK_SECRET` matches what Pathfinder sends |
| "Failed to persist" on upload | Service role key wrong | Check `SUPABASE_SERVICE_ROLE_KEY` |
| Build fails on Vercel | Missing env vars | Verify all required env vars are set in Vercel project settings |
| RLS blocking queries | org_id not set in session | Check tRPC context is setting `app.current_org_id` |
