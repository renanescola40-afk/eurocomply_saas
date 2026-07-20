# Production Edge Assurance Megapack

- Status: Accepted
- Date: 2026-07-20

## Context

Public production-edge controls were spread across deployment checks, DAST, documentation and provider configuration. A green build alone does not prove that the deployed public surface exposes the intended security headers, disclosure documents and bounded failure behavior for the exact release SHA.

## Decision

Introduce one protected, exact-main workflow that validates HTTPS, public availability, security headers, no-store behavior, `security.txt`, security and Trust Center routes, observable edge signals and bounded burst behavior. Produce a redacted exact-SHA artifact and validate it fail-closed.

Independent review and penetration testing remain explicitly `NOT_VERIFIED`; automated checks cannot promote them.

## Risks and trade-offs

- Production availability becomes a workflow dependency.
- Edge-provider headers may change without a security regression.
- Bounded bursts are not a load test or complete DDoS simulation.
- Public checks do not cover authenticated business logic.
- Strict header requirements can block release when edge configuration drifts.

## Alternatives considered

- Treat deployment success as edge assurance: rejected because deployment does not prove runtime headers or disclosure routes.
- Infer WAF and DDoS coverage from provider branding: rejected because headers do not prove purchased configuration or effectiveness.
- Mark review and pentest complete from automation: rejected as misleading.

## Rollback

Revert the workflow, scripts, tests, runbook and this decision together. Remove generated canonical evidence and return affected controls to `NOT_VERIFIED`.
