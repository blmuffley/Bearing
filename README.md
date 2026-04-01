# Avennorth Bearing

CMDB health assessment platform for ServiceNow. Scores quality across eight dimensions, quantifies technical debt, determines maturity level, and generates executive reports.

## Quick Start

```bash
# Backend
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
make run  # starts on port 8080

# Prototype UI
cd prototype && npm install && npm run dev  # starts on port 4201
```

## Documentation

See `docs/` for architecture, assessment engine, maturity model, and integration specs.
