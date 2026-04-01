---
layout: home
hero:
  name: Bearing
  text: Engineering Documentation
  tagline: Internal reference for Avennorth engineers. Architecture, APIs, deployment, and operational guides.
  actions:
    - theme: brand
      text: Architecture
      link: /architecture-deep-dive
    - theme: alt
      text: API Reference
      link: /api-reference
    - theme: alt
      text: Deployment
      link: /deployment-guide
features:
  - title: Architecture
    details: System architecture, data flow, scoring engine internals, and integration points.
    link: /architecture-deep-dive
  - title: Engine References
    details: Dimension scorer, fusion engine, and report generator implementation details.
    link: /dimension-scorer-reference
  - title: API Reference
    details: FastAPI endpoints, request/response schemas, authentication, and error handling.
    link: /api-reference
  - title: Deployment
    details: Environment setup, Docker configuration, CI/CD pipeline, and production release process.
    link: /deployment-guide
  - title: Testing
    details: Test strategy, fixtures, integration tests, and coverage requirements.
    link: /testing-guide
  - title: Consulting Playbook
    details: How to run Bearing assessments in customer engagements, from scoping to delivery.
    link: /consulting-playbook
---

::: warning INTERNAL DOCUMENTATION
This site is for Avennorth engineers only. Do not share with customers or external parties.
:::

## Quick Links

| Resource | Description |
|----------|-------------|
| [Architecture Deep Dive](/architecture-deep-dive) | Full system architecture and component design |
| [Dimension Scorer](/dimension-scorer-reference) | Eight-dimension scoring engine reference |
| [Fusion Engine](/fusion-engine-reference) | Pathfinder data fusion and composite scoring |
| [Report Generator](/report-generator-reference) | Report generation pipeline and templates |
| [API Reference](/api-reference) | REST API endpoints and schemas |
| [Deployment Guide](/deployment-guide) | Docker, environment, and infrastructure setup |
| [Production Release Guide](/production-release-guide) | Release process and checklist |
| [Testing Guide](/testing-guide) | Test strategy, fixtures, and coverage |
| [Consulting Playbook](/consulting-playbook) | Running Bearing in customer engagements |

## Diagrams

All architecture diagrams are available throughout the docs. Key diagrams:

- [System Architecture](/01_system_architecture.svg) -- Component overview
- [Assessment Data Flow](/02_assessment_data_flow.svg) -- End-to-end scan pipeline
- [Eight Dimensions](/03_eight_dimensions.svg) -- Scoring dimension breakdown
- [Maturity Model](/04_maturity_model.svg) -- Five-level maturity framework
- [Product Suite](/05_product_suite.svg) -- Avennorth product ecosystem
- [Fusion Findings](/06_fusion_findings.svg) -- Pathfinder fusion detection
