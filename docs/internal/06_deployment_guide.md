# Deployment Guide

**Internal Engineering Reference**
Last updated: 2026-04-01 | Version: 0.1.0

---

## Overview

Bearing can be deployed in three modes:

1. **Local development** -- Python venv with uvicorn hot-reload
2. **Docker** -- Single container with docker-compose
3. **Prototype UI** -- Vite dev server for the React prototype (port 4201)

---

## Local Development Setup

### Prerequisites

- Python 3.9+ (tested on 3.11 and 3.12)
- pip
- Node.js 18+ (for prototype only)
- A ServiceNow instance with API access (or plan to mock for tests)

### Step 1: Clone and Set Up Virtual Environment

```bash
cd ~/Code/Bearing
python3 -m venv .venv
source .venv/bin/activate
```

### Step 2: Install Dependencies

```bash
# Production dependencies only
make install
# OR: pip install -e .

# Development dependencies (includes pytest, ruff, mypy, pre-commit)
make dev
# OR: pip install -e ".[dev]"
```

Production dependencies (from `pyproject.toml`):
- `fastapi>=0.115.0` -- Web framework
- `uvicorn[standard]>=0.30.0` -- ASGI server
- `pydantic>=2.9.0` -- Data validation
- `pydantic-settings>=2.5.0` -- Environment configuration
- `requests>=2.32.0` -- HTTP client for ServiceNow
- `anthropic>=0.40.0` -- Claude AI SDK
- `fpdf2>=2.8.0` -- PDF generation
- `python-docx>=1.1.0` -- DOCX generation
- `matplotlib>=3.9.0` -- Chart generation
- `apscheduler>=3.10.0` -- Scheduled assessments
- `httpx>=0.27.0` -- Async HTTP client

Dev dependencies:
- `pytest>=8.3.0`, `pytest-asyncio>=0.24.0`, `pytest-cov>=5.0.0` -- Testing
- `ruff>=0.7.0` -- Linting and formatting
- `mypy>=1.12.0`, `types-requests>=2.32.0` -- Type checking
- `pre-commit>=4.0.0` -- Git hooks

### Step 3: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# ServiceNow Connection (REQUIRED)
BEARING_SN_INSTANCE=https://your-instance.service-now.com
BEARING_SN_USERNAME=bearing_service_account
BEARING_SN_PASSWORD=your_password

# OAuth2 (optional -- overrides basic auth when both are set)
BEARING_SN_CLIENT_ID=
BEARING_SN_CLIENT_SECRET=

# Claude AI Analysis (optional -- enables AI executive summaries)
ANTHROPIC_API_KEY=

# Webhook Security (required for Pathfinder/Contour integration)
BEARING_API_KEY=your-webhook-key

# Optional
BEARING_PORT=8080
BEARING_LOG_LEVEL=INFO
BEARING_SCHEDULE_CRON=
```

Authentication auto-detection priority:
1. If `SN_CLIENT_ID` and `SN_CLIENT_SECRET` are set: OAuth2
2. If `SN_USERNAME` and `SN_PASSWORD` are set: Basic auth
3. Neither: No auth (will fail on first ServiceNow API call)

### Step 4: Run the Server

```bash
make run
# OR: uvicorn bearing.main:app --reload --port 8080
```

Server starts at `http://localhost:8080`:
- API docs: `http://localhost:8080/docs`
- ReDoc: `http://localhost:8080/redoc`
- Health check: `http://localhost:8080/api/v1/health`

### Make Commands Reference

| Command | Description |
|---|---|
| `make install` | Install Bearing in editable mode |
| `make dev` | Install with dev dependencies |
| `make run` | Start server with hot-reload on port 8080 |
| `make test` | Run tests with coverage report |
| `make lint` | Run ruff linter |
| `make typecheck` | Run mypy type checker |
| `make fmt` | Format code and fix lint issues |
| `make clean` | Remove build artifacts, caches, pycache |
| `make proto-install` | Install prototype npm dependencies |
| `make proto-dev` | Start prototype Vite dev server (port 4201) |
| `make proto-build` | Build prototype for production |

---

## Docker Deployment

### Dockerfile Walkthrough

The Dockerfile uses a multi-stage build optimized for small image size and security:

**Stage 1 (`base`)**: Python 3.11 slim. Installs `libfreetype6-dev` (required by matplotlib for font rendering). Cleans apt cache.

**Stage 2 (`builder`)**: Copies `pyproject.toml` and installs all Python packages. This layer is cached and only rebuilds when `pyproject.toml` changes.

**Stage 3 (`runtime`)**: Creates a non-root `bearing` user (security best practice). Copies installed packages from builder and application source from host. Does NOT include build tools, pip, or dev dependencies.

```
Final image size: ~350MB (mostly matplotlib/numpy)
Runtime user: bearing (non-root)
Exposed port: 8080
Entry point: uvicorn bearing.main:app
```

### docker-compose.yml

```yaml
services:
  bearing:
    build: .
    ports:
      - "${BEARING_PORT:-8080}:8080"
    env_file:
      - .env
    restart: unless-stopped
```

### Build and Run

```bash
# Build
docker compose build

# Run foreground (see logs)
docker compose up

# Run background
docker compose up -d

# View logs
docker compose logs -f bearing

# Stop
docker compose down

# Rebuild after code changes
docker compose build --no-cache && docker compose up -d
```

### Custom Port

Override the port via environment variable:
```bash
BEARING_PORT=9090 docker compose up
```

### Environment in Docker

The `.env` file in the project root is read by docker-compose via `env_file: .env`. All `BEARING_*` and `ANTHROPIC_API_KEY` variables are passed into the container.

For production, consider:
- Docker secrets or a secrets manager instead of `.env` files
- Environment variables set via orchestrator (Kubernetes, ECS)

---

## Prototype Deployment

The React/Vite prototype is independent from the Python backend. It uses static demo data and does NOT connect to the Bearing API.

### Setup and Run

```bash
make proto-install   # npm install in prototype/
make proto-dev       # Starts at http://localhost:4201
```

### Production Build

```bash
make proto-build     # Outputs to prototype/dist/
```

Serve the static build:
```bash
cd prototype && npx serve dist -p 4201
```

### Prototype Stack

| Library | Version | Purpose |
|---|---|---|
| React | 18.3+ | UI framework |
| React Router | 6.27+ | Client-side routing |
| Recharts | 2.13+ | Charts and visualizations |
| Tailwind CSS | 3.4+ | Styling |
| Vite | 6.0+ | Build tool and dev server |
| TypeScript | 5.6+ | Type safety |

### Demo Data Files

- `src/data/demo-pre-pathfinder.ts` -- Assessment without Pathfinder data
- `src/data/demo-post-pathfinder.ts` -- Assessment with fusion findings
- `src/data/demo-data.json` -- Raw JSON demo data

The prototype's fusion toggle switches between pre- and post-Pathfinder datasets to demonstrate the before/after experience.

---

## CI/CD Pipeline

### GitHub Actions: CI Workflow

**File**: `.github/workflows/ci.yml`
**Triggers**: Push to `main`, pull requests targeting `main`
**Matrix**: Python 3.11, Python 3.12

Pipeline steps:
1. Checkout code
2. Set up Python (matrix version)
3. Install dependencies: `pip install -e ".[dev]"`
4. **Lint**: `ruff check src/` -- Enforces code style and catches common errors
5. **Type check**: `mypy src/bearing/` -- Strict mode type checking
6. **Test**: `pytest --cov=bearing --cov-report=term-missing` -- Tests with 80% coverage threshold

All three gates must pass for a green build.

### GitHub Actions: Release Workflow

**File**: `.github/workflows/release.yml`
**Triggers**: Push of tags matching `v*` pattern

Steps:
1. Checkout code
2. Build Docker image tagged with the Git tag name

To create a release:
```bash
git tag v0.1.0
git push origin v0.1.0
```

### Code Quality Tools Configuration

**Ruff** (`pyproject.toml`):
- Target: Python 3.9
- Line length: 100
- Rules: E (errors), F (pyflakes), I (isort), N (naming), W (warnings), UP (pyupgrade), B (bugbear), A (builtins), SIM (simplify), TCH (type checking)

**Mypy** (`pyproject.toml`):
- Strict mode enabled
- Pydantic plugin for model validation

**pytest** (`pyproject.toml`):
- Test path: `src/tests/`
- asyncio_mode: `auto`
- Coverage source: `bearing`
- Coverage fail threshold: 80%

---

## Monitoring and Health Checks

### Health Endpoint

```bash
curl http://localhost:8080/api/v1/health
# {"status": "healthy", "version": "0.1.0"}
```

Use for:
- Load balancer health probes
- Container liveness/readiness checks
- Uptime monitoring (Pingdom, UptimeRobot, etc.)

### Recommended Docker Health Check

Add to `docker-compose.yml`:
```yaml
services:
  bearing:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/api/v1/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
```

### Logging

Format: `%(asctime)s [%(levelname)s] %(name)s: %(message)s`
Level: Configurable via `BEARING_LOG_LEVEL` (default: INFO)

Key log messages to monitor:

| Log Level | Message Pattern | Meaning |
|---|---|---|
| INFO | "Starting assessment {id}" | Assessment began |
| INFO | "Fetched {n} records from {table}" | ServiceNow query completed |
| INFO | "Assessment {id} complete: score={n}" | Assessment succeeded |
| INFO | "Ingested {n} CI confidence records" | Pathfinder feed processed |
| WARNING | "Failed to write results to ServiceNow" | SN write failed (results in memory) |
| WARNING | "Token refresh failed" | OAuth token issue |
| ERROR | "Assessment {id} failed" | Assessment crashed |

---

## Production Considerations

### Multi-Worker Deployment

uvicorn runs a single worker by default. For production throughput:

```bash
# Option 1: uvicorn workers
uvicorn bearing.main:app --host 0.0.0.0 --port 8080 --workers 4

# Option 2: gunicorn with uvicorn workers
gunicorn -w 4 -k uvicorn.workers.UvicornWorker bearing.main:app
```

**Important**: In-memory state (assessments, Pathfinder confidence store) is per-worker. Multiple workers each have independent state. For shared state, add a database backend (PostgreSQL, Redis).

### HTTPS/TLS

uvicorn does not terminate TLS. Options:
- Reverse proxy: nginx, Caddy, Traefik
- Cloud load balancer: AWS ALB, GCP Load Balancer
- Kubernetes ingress controller

### Secrets Management

Never commit `.env` files. Production options:
- AWS Secrets Manager
- HashiCorp Vault
- Kubernetes secrets
- Docker secrets

### API Rate Limiting

Not currently implemented. For public-facing deployments, add `slowapi` middleware or use reverse proxy rate limiting.

### CORS

Not configured. If the prototype or other browser-based clients need to call the API, add FastAPI CORS middleware in `main.py`:

```python
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:4201"], ...)
```
