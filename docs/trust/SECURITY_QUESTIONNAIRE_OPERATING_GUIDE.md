# Enterprise Security Questionnaire Operating Guide

## Purpose

RISCK COMPLY publishes a reusable, evidence-bound answer set for common enterprise security and procurement questions. The pack reduces repetitive manual work while preserving an honest truth boundary.

## Public surfaces

- `/{locale}/trust/security-questionnaire`
- `/api/trust/security-questionnaire`
- `/{locale}/trust/procurement-pack`

## Operating rules

1. Answers must describe only repository-backed or configuration-bound capabilities.
2. Certification, audit, penetration-test and uptime claims remain `not-claimed` or `evidence-required` until current evidence exists.
3. No tenant data, customer identifiers, private evidence, secrets, environment values or internal URLs may be published.
4. Provider regions and optional services must remain configuration-bound.
5. Contractual commitments belong in signed agreements, not the public questionnaire.
6. Evidence links must resolve to same-origin public trust documents.
7. Every material answer change requires unit tests, public-claims validation and review by security/product owners.
8. The machine-readable endpoint uses the distributed `general-api` policy with an anonymized client-IP subject, a bounded request window and standardized rate-limit responses. Because this is a low-risk public read, Redis unavailability must not make the trust document unavailable.
9. Public caching must remain bounded, and responses must preserve `X-Content-Type-Options: nosniff` plus the restrictive document Content Security Policy.

## Review cadence

Review at least quarterly and after any material change to identity, hosting, database, billing, monitoring, analytics, incident response, subprocessors or enterprise contracts.

## Buyer handoff

Sales or procurement teams may share the page or JSON endpoint. They must not edit the answer set externally to make stronger claims. Customer-specific answers should reference the canonical public statement and add only approved, dated evidence.

## Rollback

If an answer becomes inaccurate, remove or downgrade it to `evidence-required`, deploy the correction, notify affected active procurement processes and record the reason in the security change log.
