---
outline: deep
---

<!--@include: ../../docs/internal/06_deployment_guide.md-->

## Deployment Options Diagram

![Deployment Options](/09_deployment_options.svg)

## Dockerfile

Multi-stage Docker build for the Bearing API server. Uses Python 3.11-slim as the base image with matplotlib system dependencies.

```dockerfile
FROM python:3.11-slim AS base

WORKDIR /app

# Install system dependencies for matplotlib
RUN apt-get update && apt-get install -y --no-install-recommends \
    libfreetype6-dev \
    && rm -rf /var/lib/apt/lists/*

FROM base AS builder

COPY pyproject.toml ./
RUN pip install --no-cache-dir .

FROM base AS runtime

RUN useradd --create-home --shell /bin/bash bearing
USER bearing

COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY src/bearing /app/bearing

EXPOSE 8080

CMD ["uvicorn", "bearing.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

## Docker Compose

Minimal `docker-compose.yml` for running the Bearing service. Port is configurable via the `BEARING_PORT` environment variable (defaults to 8080).

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

## Running with Docker

```bash
# Build and start
docker compose up --build -d

# View logs
docker compose logs -f bearing

# Stop
docker compose down

# Custom port
BEARING_PORT=9090 docker compose up --build -d
```

## Running without Docker

```bash
# Install dependencies
pip install -e .

# Start the server
uvicorn bearing.main:app --host 0.0.0.0 --port 8080

# Or use the Makefile
make run
```
