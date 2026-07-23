# GitHub Actions Gate Map

## Problem

Normal pull requests were evaluated by several overlapping workflows. A single route-inventory or authorization-contract failure could appear again in CI, the security suite, the production gate and enterprise readiness checks. Runtime evidence and qualified-review gaps also appeared as merge failures even when the pull request existed to build those capabilities.

## Canonical architecture

| Category | Trigger | Blocking behavior | Responsibility |
| --- | --- | --- | --- |
| PR Merge Gate | pull request to `main` | Blocking | Lockfile alignment, lint, typecheck, unit tests, applicable E2E, build, npm audit, application security gates and route quality. |
| Enterprise Production Gate | push to `main` or manual dispatch | Blocking for release/promotion only | Exact-SHA release validation and retained evidence. It does not run on normal pull requests. |
| Enterprise Evidence Closure — report | evidence-related pull requests and pushes | Non-blocking maturity report | Generates exact-SHA gap artifacts and publishes a visible NO-GO notice when runtime or qualified-review evidence is incomplete. |
| Enterprise Evidence Closure — strict | protected manual dispatch | Blocking | Fails closed when canonical evidence is incomplete, invalid, stale or belongs to another SHA. |
| CodeQL, Semgrep, Gitleaks and Secret Scanning | repository security events | Blocking according to branch protection | Independent specialist scanners; not removed or weakened by this change. |

## Root-cause classification

### Real blocking failures

- lockfile mismatch;
- lint, typecheck, tests or build failure;
- dependency vulnerability at the configured threshold;
- authentication, RBAC, BOLA, RLS, origin, no-store or route-hardening contract failure;
- secret exposure.

### Cascading failures

Aggregator workflows repeating an already-failed canonical command are not separate root causes. The PR Merge Gate is the single code-quality and application-security decision.

### Non-blocking enterprise gaps

- runtime evidence coverage below the target;
- qualified human review missing;
- disaster-recovery evidence missing or expired;
- final enterprise closure remaining NO-GO.

These gaps remain visible and auditable, but strict enforcement belongs to release or protected promotion.

## Required status contexts

Recommended branch protection after this workflow reports successfully:

1. `PR Merge Gate / PR Merge Gate`;
2. `Code Review`;
3. `Secret Scanning`;
4. CodeQL and other specialist scanners required by the repository security policy.

Legacy `CI / quality`, enterprise-production and enterprise-closure contexts must be removed from the required list only after the new context has reported on at least one pull request.
