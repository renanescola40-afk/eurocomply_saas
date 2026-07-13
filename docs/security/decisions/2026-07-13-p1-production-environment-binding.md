# Decision: bind final P1 evidence to production

Date: 2026-07-13

## Context

Final P1 evidence required `productionValidated: true`, but the evidence checker accepted any non-empty `environment` value and did not require `targetEnvironment`.

A structurally valid file could therefore combine `productionValidated: true` with `environment: "staging"`, `local`, or another non-production value. That would make the final evidence package internally misleading even though its fields passed validation.

## Decision

Every committed final P1 control evidence file must now contain both:

- `environment: "production"`
- `targetEnvironment: "production"`

The rule is enforced whenever a final evidence file exists, in normal and strict gate modes. Missing evidence files remain allowed in non-strict mode so evidence can be collected incrementally.

## Impact

This changes evidence-governance validation only. It does not alter application runtime, infrastructure, databases, credentials, deployments, customer data, or the status of any P1 control.

The existing P1-06 SBOM evidence already declares both fields as `production` and is expected to remain valid.

## Risks and tradeoffs

The canonical environment vocabulary is intentionally strict. Evidence generated from previews, staging, local development, test tenants, or ambiguous environment names cannot be promoted to final P1 production evidence.

If the production environment is later represented by a different canonical identifier, the schema and validator must be changed together in a reviewed pull request rather than weakening the check ad hoc.

## Validation

Regression tests cover:

- acceptance of production-bound evidence;
- rejection of a non-production source environment;
- rejection of a non-production target environment.

GitHub Actions and Vercel results on the pull request are the authoritative execution evidence. This decision does not claim a runtime audit, pentest, external review, or completion of missing P1 controls.

## Rollback

Revert the pull request. No data, infrastructure, credential, deployment, or environment rollback is required.
