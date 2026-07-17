# Fail closed on onboarding activation-state reads

## Status

Accepted

## Context

The onboarding activation query combines organization metadata, the first AI system, and the latest activation run. Previously it used the optional privileged Supabase client and returned a partially populated state when that client was unavailable. Unexpected database or provider errors were logged and then converted into null or fallback fields.

Those values are valid business states, so callers could not distinguish an incomplete onboarding journey from unavailable governance data. That ambiguity can misdirect activation, readiness scoring, task generation, document recommendations, and plan-selection workflows.

## Decision

- Require `createAdminClient()` for authenticated onboarding activation-state reads.
- Propagate missing privileged-client configuration.
- Preserve the explicitly recognized schema-compatibility fallbacks for missing legacy tables or columns.
- For every other organization, AI-system, or activation-run query error, log only the provider error code and throw `onboarding_state_unavailable`.
- Preserve organization scoping, deterministic ordering, and the existing successful response shape.

## Consequences

Infrastructure and provider failures now surface through the existing error boundary instead of appearing as a legitimate partial onboarding state. Genuine missing membership, successful zero-row reads, and recognized schema-transition states retain their existing behavior.

The change can reveal previously hidden configuration or database failures. This is intentional because unavailable onboarding evidence must not be represented as completed, empty, or partially configured state.

## Evidence and limitations

Evidence is limited to the repository diff, the source regression contract, and exact-head CI results. This decision does not prove production Supabase availability, deployed schema completeness, external audit completion, or penetration-test coverage.

## Verification

Run:

```bash
npx vitest run tests/security/onboarding-state-read-fail-closed.test.ts
```

All required GitHub checks must pass against the exact pull-request head SHA before merge.

## Rollback

Revert the commits introduced by the pull request. No migration, dependency, secret, RLS, RBAC, or provider rollback is required.
