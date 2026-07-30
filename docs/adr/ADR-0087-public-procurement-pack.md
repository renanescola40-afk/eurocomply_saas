# ADR-0087: Public evidence-bound procurement pack

## Status

Accepted.

## Context

Enterprise buyers need a stable, reviewable trust package. Scattered pages make due diligence slower and increase the risk of inconsistent claims.

## Decision

Maintain a typed repository catalog as the single public source for control status, provider boundaries and trust-document links. Render it through a localized page and a machine-readable JSON endpoint.

## Security decisions

- The endpoint is public by design and contains no tenant data.
- Environment secrets, customer identifiers and raw runtime evidence are prohibited.
- Certification and penetration-test claims remain `not-claimed` until dated evidence exists.
- Provider regions are described conservatively and require customer-pack confirmation.
- Contractual commitments remain outside the public catalog.

## Consequences

Procurement review becomes faster and consistent. The catalog must be versioned and reviewed whenever architecture, providers, legal terms or assurance evidence changes.
