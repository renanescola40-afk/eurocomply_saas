# Enterprise procurement pack

## Objective

Provide buyers with one public, evidence-bound package for security, privacy, compliance and procurement review without unsupported certification or uptime claims.

## Ten integrated workstreams

1. Canonical control-status model.
2. Explicit evidence references per control.
3. Public provider and region-disclosure boundary.
4. Canonical trust-document registry.
5. Localized procurement-pack page for all supported locales.
6. Machine-readable JSON endpoint.
7. Same-origin absolute document links.
8. Conservative legal and certification non-claims.
9. Unit and browser contract coverage.
10. Release, review and incident-maintenance guidance.

## Status meanings

- `implemented`: repository implementation exists and remains subject to production verification.
- `configured`: the control depends on the active managed-provider configuration.
- `evidence-required`: a current runtime or customer-specific artifact is required before reliance.
- `not-claimed`: RISCK COMPLY deliberately makes no certification or assurance claim.

## Public surfaces

- `/{locale}/trust/procurement-pack`
- `/api/trust/procurement-pack`

The API is intentionally public and must contain no tenant data, credentials, internal identifiers, customer evidence or environment secrets.

## Review cadence

Review the catalog after material architecture, provider, region, legal, security-control or certification changes. Update `PROCUREMENT_PACK_VERSION` whenever the published meaning changes.

## Contract boundary

This pack is informational. Signed customer agreements, DPAs, order forms and negotiated security schedules govern contractual commitments.
