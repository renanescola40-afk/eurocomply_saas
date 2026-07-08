# P0 Runtime Evidence Register

Current final decision: **No-Go**.

This file records release evidence for the current assessed commit. Partial status observations are not counted as completed runtime proof.

## Current release assessment

- Assessment date: 2026-07-08
- Repository: `renanescola40-afk/eurocomply_saas`
- Scope: public production release readiness
- Decision: No-Go until every release-blocking item below is `Complete` for the exact final release commit.

## Evidence status

| Evidence item | Status | Required evidence | Owner | Next action |
| --- | --- | --- | --- | --- |
| Branch protection applied on `main` | Open | `docs/security/evidence/runtime/branch-protection-required-checks.json` must prove the final release branch protection rules for the assessed commit | Release owner | Revalidate branch protection for the final release commit |
| Required status checks configured | Open | `docs/security/evidence/runtime/branch-protection-required-checks.json` must prove required checks are enforced on `main` | Release owner | Revalidate required checks for the final release commit |
| Production provider configuration evidence | Open | Provider settings review evidence must prove required production providers are configured without exposing secret values | Release owner | Confirm Vercel, GitHub, Supabase, Stripe and Sentry provider settings before Go |
| Auth/RBAC final runtime validation | Open | `docs/security/evidence/runtime/auth-rbac-final-validation.json` must prove Supabase Auth, RBAC, tenant isolation, no legacy identity fallback, runtime validation, customer-facing proof approval, and all blocking evidence complete for the exact final release commit | Security reviewer | Run production-like auth/RBAC validation and replace placeholder No-Go evidence with real runtime proof |
| Supabase live RLS validation completed | Complete | `docs/security/evidence/runtime/supabase-live-rls-validation.json` records status `Complete`, outcome `passed`, timestamp, redacted Supabase project reference, tables reviewed, tests passed/failed, zero failures, reviewer, command used, commit SHA, RLS enablement, tenant isolation, profile scoping, role separation, same-tenant allowed behavior, and backend-owned write denial | Security reviewer | Re-run only if production Supabase project or policies changed |
| External review | Open | External security review report, pentest report, or approved exception evidence must be attached before enterprise Go | Security reviewer | Attach external review evidence or approved exception before enterprise Go |
| Deterministic npm lockfile committed | Complete | Package lockfile commit evidence exists; attach exact final runner install output before Go | Engineering owner | Attach final runner output |
| Floating dependency specs removed | Complete | Dependency report evidence exists and records no forbidden floating specs | Engineering owner | Attach final security output before Go |
| Deployment URL functional verification | Open | `docs/security/evidence/runtime/deployment-smoke-validation.json` must record a passing production smoke test for the target deployment URL | Platform owner | Configure production URL/readiness token/build metadata and rerun deployment smoke |
| Final validation runner | Open | `docs/security/evidence/runtime/final-validation-runner.json` or `docs/security/evidence/runtime/production-final-validation.json` must record final runner output for the exact release commit | Release owner | Attach final runner output after all runtime checks pass |
| Audit-chain live validation | Open | `docs/security/evidence/runtime/audit-chain-live-validation.json` must prove live audit-chain integrity for the target deployment/project | Security reviewer | Run live audit-chain validation |
| Upload malware/content scanning validation | Open | `docs/security/evidence/runtime/upload-malware-scan-validation.json` must record proof for the exact final release commit before this item can be marked Complete | Security reviewer | Re-run runtime validation for the exact final release commit |
| Step-up MFA / IdP validation | Open | `docs/security/evidence/runtime/step-up-mfa-validation.json` must prove step-up MFA or IdP enforcement where required | Security reviewer | Run step-up runtime validation |
| Stripe billing runtime validation | Open | `docs/security/evidence/runtime/stripe-billing-validation.json` must prove checkout, portal, webhook, idempotency, and safe error behavior in target runtime | Billing owner | Run Stripe billing runtime validation with test-mode/synthetic data only |
| Observability readiness | Open | `docs/security/evidence/runtime/observability-smoke-validation.json` must prove Sentry/local logging, request IDs, protected smoke access, no-store behavior and secret redaction without leaking sensitive values | SRE owner | Run observability smoke validation against the target deployment |
| Rollback owner and rollback target | Open | `docs/security/evidence/runtime/rollback-dry-run-validation.json` must prove last-known-good URL, rollback target SHA, owner approval, health/no-store, and functional validation proof | Release owner | Configure rollback target URL/SHA and rerun rollback dry-run |

## Go/No-Go rule

Release remains blocked while any required P0 runtime evidence item is `Open`, `Exception`, or missing from this register.

`Complete` means the evidence file exists, is for the exact release commit or approved target, has redacted secret handling, and records an outcome of `passed` or an explicitly approved exception where the release policy allows it.

Current final decision: **No-Go**.
