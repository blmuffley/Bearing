---
outline: deep
---

# Known Issues and Limitations

Current known issues and limitations in the Bearing platform. This page is maintained by engineering and should be reviewed before filing new bugs.

## Python 3.9 Compatibility

Bearing requires `from __future__ import annotations` at the top of every module for Python 3.9 compatibility. The `eval_type_backport` package is also required as a dependency. All new modules must include this import.

::: warning
Forgetting `from __future__ import annotations` will cause `TypeError` on Python 3.9 when using PEP 604 union types (`X | Y`) or PEP 585 generics (`list[str]`).
:::

## PDF Em-Dash Rendering

The Helvetica font bundled with fpdf2 does not support the Unicode em-dash character (U+2014). Using `--` in report text will render correctly, but the literal em-dash (`---`) will produce a missing glyph. All report strings should use ASCII dashes (`-`) instead.

## In-Memory Storage

Assessment data is stored in-memory and is lost on application restart. ServiceNow write-through is implemented, meaning assessment results can be written back to the ServiceNow instance, but this requires an active ServiceNow connection. Without a connected instance, restarting the application will lose all assessment data.

::: danger
There is currently no persistence layer beyond ServiceNow write-through. Do not rely on the application retaining data across restarts without a ServiceNow connection.
:::

## Large Instance Handling

Instances with 100K+ CIs may hit ServiceNow API rate limits. The built-in pagination uses a 0.1-second delay between pages, but this may not be sufficient for very large instances or instances with aggressive rate limiting configured.

**Symptoms:** HTTP 429 responses, incomplete assessment data, scoring anomalies.

**Mitigation:** Increase the delay between paginated requests (see [Workarounds](./workarounds)).

## Pathfinder Confidence Store

The Pathfinder confidence store is in-memory only. Confidence data received via the `/api/v1/webhooks/pathfinder` endpoint is not persisted and will be lost on application restart. There is no expiration or TTL on stored confidence records.

## Prototype is Demo-Only

The React prototype (`proto/`) is a demo-only frontend that uses static demo data. It is not connected to the live backend API. The prototype is intended for sales demonstrations and stakeholder reviews only.

## VitePress Documentation Sites

Each documentation site under `docs-site/` has its own `package.json` and requires a separate `npm install` before running. The root `npm install` does not install dependencies for documentation sub-sites.

```bash
# For the internal docs site
cd docs-site/internal && npm install && npm run dev

# For the customer-facing docs site
cd docs-site/customer && npm install && npm run dev
```

## pytest-asyncio Version

The `pytest-asyncio` package is pinned to version 0.21.x for Python 3.9 compatibility. Newer versions (0.23+) require Python 3.10+. Do not upgrade this dependency without also raising the minimum Python version.
