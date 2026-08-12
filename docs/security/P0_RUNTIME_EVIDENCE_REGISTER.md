# P0 Runtime Evidence Register Policy

> **Policy metadata only.** This versioned Markdown file is not the current release decision and must never be used as proof that a control passed.

Current P0 status is generated for the exact assessed SHA by:

```bash
node scripts/security/generate-p0-runtime-evidence-register.mjs --sha=<40-character-main-sha>
```

The generated JSON and Markdown artifacts are written under `artifacts/p0-runtime-evidence-register/`. Status is derived from canonical validators and repository checks. A human-edited word such as `Complete` cannot promote runtime evidence.

## Policy rules

- Every row below remains `Open` in version control.
- The table provides control names, evidence requirements, owners and next actions only.
- Runtime completion requires the exact evidence file, exact SHA, canonical validator success, passing outcome, acceptable freshness and no placeholder-only content.
- Repository completion is recalculated from the current checkout.
- Missing, malformed, stale, wrong-SHA or unsupported evidence remains blocking.
- Exceptions are recorded in dedicated approved evidence, never by editing this table.
- The release decision is `GO` only when the generated register reports every canonical P0 control as `Complete`.

## Canonical policy metadata

| Evidence item | Status | Required evidence | Owner | Next action |
| --- | --- | --- | --- | --- |
| Branch protection applied on `main` | Open | `docs/security/evidence/runtime/branch-protection-required-checks.json` must prove the final release branch protection rules for the assessed commit | Release owner | Run the protected branch/ruleset proof for the exact current `main` SHA |
| Required status checks configured | Open | `docs/security/evidence/runtime/required-status-checks.json` must independently prove the complete canonical required-check set and strict up-to-date enforcement on the exact current `main` SHA | Release owner | Keep every canonical required check enforced for everyone and strict on `main` |
| Production provider configuration evidence | Open | `docs/security/evidence/runtime/production-secrets-provider-stores.json` must prove required production providers are configured without exposing secret values | Release owner | Confirm Vercel, GitHub, Supabase, Stripe and Sentry provider settings and generate redacted proof |
| Auth/RBAC final runtime validation | Open | `docs/security/evidence/runtime/auth-rbac-final-validation.json` must prove auth, RBAC, tenant isolation, no legacy identity fallback and runtime validation for the exact SHA | Security reviewer | Run production-like Auth/RBAC validation against the target environment |
| Supabase live RLS validation completed | Open | `docs/security/evidence/runtime/supabase-live-rls-validation.json` must pass freshness, provenance, full-SHA, redaction, table coverage and cross-tenant operation validators | Security reviewer | Run `npm run security:rls:live` against the target Supabase project for the exact promoted SHA |
| External review | Open | `docs/security/evidence/runtime/external-security-review-or-pentest.json` must reference an independent security review, pentest or policy-approved exception | Security reviewer | Attach qualified independent review evidence and validated remediation status |
| Deterministic npm lockfile committed | Open | `package-lock.json` must parse, use the supported lockfile version and align with the pinned npm package manager and root package | Engineering owner | Run deterministic install and package-lock alignment gates on the exact checkout |
| Floating dependency specs removed | Open | `package.json` must contain no forbidden wildcard, channel, URL, git or local dependency specifications | Engineering owner | Run supply-chain and dependency-spec validation on the exact checkout |
| Deployment URL functional verification | Open | `docs/security/evidence/runtime/deployment-smoke-validation.json` must record a passing production smoke test for the target deployment URL and exact SHA | Platform owner | Configure production URL, readiness token and build metadata, then rerun deployment smoke |
| Final validation runner | Open | `docs/security/evidence/runtime/final-validation-runner.json` must record final runner output for the exact release commit | Release owner | Run the protected final validation after all prerequisite runtime proofs pass |
| Audit-chain live validation | Open | `docs/security/evidence/runtime/audit-chain-live-validation.json` must prove live audit-chain integrity for the target project and exact SHA | Security reviewer | Run live audit-chain validation and preserve redacted exact-SHA evidence |
| Upload malware/content scanning validation | Open | `docs/security/evidence/runtime/upload-malware-scan-validation.json` must prove the configured production scanner and safe failure behavior for the exact SHA | Security reviewer | Run runtime malware/content scanner validation with safe synthetic fixtures |
| Step-up MFA / IdP validation | Open | `docs/security/evidence/runtime/step-up-mfa-validation.json` must prove provider-backed step-up enforcement for sensitive actions | Security reviewer | Run provider-backed MFA/IdP step-up validation for the exact release SHA |
| Stripe billing runtime validation | Open | `docs/security/evidence/runtime/stripe-billing-validation.json` must prove checkout, portal, webhook verification, idempotency and safe error behavior | Billing owner | Run Stripe test-mode runtime validation with synthetic data for the exact SHA |
| Observability readiness | Open | `docs/security/evidence/runtime/observability-smoke-validation.json` must prove error capture, request IDs, protected smoke access, no-store and secret redaction | SRE owner | Run observability smoke against the target deployment and retain redacted proof |
| Rollback owner and rollback target | Open | `docs/security/evidence/runtime/rollback-dry-run-validation.json` must prove last-known-good URL, target SHA, owner approval, health and functional validation | Release owner | Configure the rollback target and execute an isolated functional rollback drill |

## Truth boundary

This policy file intentionally remains `Open`. It can describe what evidence is required, but it cannot assert that runtime work happened. Only the generated exact-SHA register and its underlying canonical evidence may support a release decision.
