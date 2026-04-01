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
