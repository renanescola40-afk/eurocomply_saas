# ADR: Public enterprise security questionnaire pack

## Status

Accepted.

## Context

Enterprise buyers repeatedly ask overlapping security, privacy, compliance and supplier questions. Manual answers drift, overpromise and become detached from the deployed product.

## Decision

Maintain one typed questionnaire domain in the application repository and expose it through a localized public page and a machine-readable JSON endpoint.

Each answer has a stable identifier, category, answer status, evidence links and an optional caveat. The supported statuses are:

- `implemented`;
- `configuration-bound`;
- `evidence-required`;
- `not-claimed`.

Evidence URLs are resolved against the request origin. The endpoint contains no tenant or customer data.

## Security properties

- public read-only output;
- same-origin evidence references;
- explicit non-claims;
- no secrets, private IDs or environment values;
- deterministic answer identifiers;
- short public cache with stale-while-revalidate;
- content-type hardening and frame denial.

## Consequences

Procurement answers become faster and more consistent. Stronger customer-specific commitments still require dated evidence and signed contractual review. The public endpoint cannot be treated as a certification report or contractual warranty.
