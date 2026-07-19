# Promote exact-SHA automated DAST evidence

- Status: Proposed
- Date: 2026-07-19
- Scope: application security, release evidence, enterprise readiness

## Context

The repository already contains a legacy OWASP ZAP baseline workflow aimed at a public deployment. That workflow creates reports but is not an exact-SHA scorecard dependency and does not prevent a stale deployment from being presented as evidence for a newer commit.

The Enterprise Readiness Scorecard therefore keeps TRU-10, automated DAST, as `NOT_VERIFIED`.

## Decision

Add an `Enterprise DAST` workflow that builds the exact pull-request or `main` SHA, starts the resulting application with synthetic public CI configuration, and scans the production-like local server with OWASP ZAP Baseline.

The workflow will:

1. use deterministic dependency installation;
2. build and start the exact checked-out SHA;
3. scan only the unauthenticated localized application entrypoint;
4. retain ZAP diagnostics and SHA-256 digests;
5. fail when a High-risk alert is present;
6. avoid production credentials and customer data;
7. become a required workflow observed by the exact-SHA GitHub-check capture;
8. generate canonical `dast-automated.json` evidence only when the workflow succeeds for the exact assessed SHA.

## Consequences

### Positive

- TRU-10 can be promoted from executed, exact-SHA evidence rather than from the existence of a workflow file.
- A stale public deployment cannot satisfy the control for a newer commit.
- High-risk ZAP findings block scorecard completion and merge readiness.
- Raw reports remain diagnostic artifacts while the canonical scorecard document stores only derived, redacted provenance.

### Risks and trade-offs

- ZAP Baseline covers unauthenticated passive and spider-discovered behavior; it is not a penetration test.
- Business-logic, authenticated, tenant-specific and provider-specific paths remain outside this control.
- Medium, Low and Informational alerts do not fail the gate and still require triage.
- The ZAP container and application build increase CI duration and resource consumption.
- A runner, Docker or image-registry outage can temporarily block the scorecard because the control fails closed.
- Local production-like behavior does not prove deployed WAF, CDN, network or hosting configuration.

## Validation

Repository tests verify the workflow trigger, exact-SHA checkout, deterministic build, production-like server, pinned ZAP release, High-risk threshold, report retention, scorecard dependency, canonical evidence path and redaction declarations.

GitHub Actions on the exact pull-request head remains authoritative for executing the DAST scan and the complete enterprise gate suite.

## Evidence boundary

This decision permits promotion of automated DAST for one exact source SHA. It does not claim production deployment, authenticated scan coverage, absence of every vulnerability, external review, penetration testing, WAF effectiveness, legal compliance or certification.

## Rollback

Revert the Enterprise DAST workflow, capture-script integration, contract test and this ADR together. Remove generated `docs/security/evidence/p1/dast-automated.json` and return TRU-10 to `NOT_VERIFIED`. No database, provider, credential or customer-data rollback is required.
