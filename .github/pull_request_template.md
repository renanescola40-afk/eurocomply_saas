## Objective

Describe the production, customer, security, reliability, performance, architecture, or commercial outcome this PR is intended to improve.

## Motivation and root cause

Explain the concrete repository evidence, product problem, or operational risk. Distinguish observed facts from assumptions. Do not claim production impact without runtime evidence.

## Prioritization and ROEI

- Priority: `P0` / `P1` / `P2` / `P3`
- Why this is the highest-value available work:
- Expected customer or production benefit:
- Estimated implementation and maintenance cost:
- Higher-ranked work blocked by dependencies, if any:

## Overlap review

List related open pull requests, issues, merged-but-unreleased changes, or shared abstractions reviewed before implementation.

- [ ] No open PR already solves this problem.
- [ ] Related work is linked below.
- Related PRs/issues:

## Technical approach

Describe the architecture, changed boundaries, affected data flows, shared infrastructure, migrations, compatibility, and rejected alternatives.

## Impact and measurement

Document measurable before/after evidence when available.

- Metric(s):
- Before:
- After:
- Measurement method:

When measurement is unavailable, state exactly:

> Measurement unavailable in the current execution environment.

## Security, privacy, and tenancy

Check every item that applies before requesting review:

- [ ] No secrets, private keys, service-role credentials, cookies, authorization headers, or customer data are exposed.
- [ ] Server-only variables remain server-only.
- [ ] New or changed routes are authenticated or explicitly documented as public.
- [ ] Resource and tenant identifiers are validated server-side.
- [ ] Role, plan, organization, and object-level authorization were reviewed.
- [ ] RLS and tenant isolation are preserved.
- [ ] Mutating routes preserve trusted-origin protection.
- [ ] Sensitive responses preserve no-store behavior and sanitized errors.
- [ ] Inputs are bounded and schema validated at trust boundaries.
- [ ] Logs and telemetry avoid unnecessary PII and sensitive payloads.
- [ ] Security headers, CSP, CORS, uploads, storage, auditability, and supply-chain controls are not weakened.
- [ ] Fail-open/fail-closed trade-offs are documented where relevant.

## Reliability and operational impact

- Failure modes:
- Retry/idempotency behavior:
- Health/readiness/smoke impact:
- Observability and incident diagnostics:
- Operational owner:

## Backward compatibility and migrations

- [ ] No breaking API, schema, configuration, or customer workflow change.
- Migration or compatibility plan, when applicable:

## Tests and quality gates

Record exact commands and truthful outcomes. Do not mark an unavailable or failed check as passed.

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] Relevant E2E tests
- [ ] `npm run build`
- [ ] Relevant focused security checks
- [ ] `npm run security:ci`
- [ ] Relevant release, RLS, upload, billing, or phase gates
- [ ] Required GitHub CI is green on the exact current head SHA

Evidence/output:

```text
Paste concise, sanitized output or link to CI.
```

## External deployment status

Complete this section whenever Vercel or another deployment provider is unavailable, rate-limited, quota-blocked, or otherwise unable to validate the exact PR SHA. A provider-only quota signal must not prevent branch, commit, push, or PR creation.

- Provider: `Vercel` / `Not applicable`
- Status: `PASS` / `BLOCKED — external provider quota/rate limit` / `NOT VERIFIED`
- Exact provider signal:
- Code implication: `No code defect inferred from provider-only signal` / describe verified code impact
- PR creation: `PROCEEDED` / `BLOCKED` with reason
- Merge implication: `Final merge remains human-controlled and branch protection remains authoritative`
- Production validation: `PASS` / `NOT VERIFIED for this exact SHA`
- Owner action, when blocked:

Do not change code, dependencies, tests, workflows, or required protections merely to turn a Vercel quota result green. Use `.github/agents/pr-creation-with-vercel-limit.prompt.md` when the signal is a Vercel build rate limit.

## Evidence limitations

State what was not validated, including unavailable production credentials, runtime environments, external providers, load tests, audits, pentests, or customer data.

## Risks and trade-offs

- Expected risks:
- Residual risk:
- Mitigations:
- Opportunity cost:
- Accepted exception and expiry date, if any:

## Rollback

Describe the exact code, configuration, migration, provider, data, and deployment rollback. State when a simple revert is sufficient.

## Documentation and decision records

- [ ] Relevant documentation was updated.
- [ ] A decision record was added or updated when architecture, security posture, tenancy, data, providers, billing, caching, or release policy changed.
- Decision record:

## Out of scope / follow-ups

List only intentional exclusions. Do not use follow-ups to defer required safety, correctness, or test work.

## Final acceptance

- [ ] This PR is coherent and reviewable.
- [ ] It solves one production problem completely.
- [ ] It does not duplicate open work.
- [ ] It provides meaningful engineering or business value.
- [ ] No avoidable regression was introduced.
- [ ] Automatic merge and automatic branch synchronization are disabled.
- [ ] Independent approval and all conversations apply to the exact current head.
- [ ] The final merge will be an explicit human-owner action.
