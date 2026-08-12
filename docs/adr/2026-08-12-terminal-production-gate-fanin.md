# ADR: Terminalize the production gate before readiness scorecard fan-in

- Date: 2026-08-12
- Status: Accepted
- Scope: Enterprise exact-SHA runtime evidence orchestration

## Context

The Enterprise Production Gate hydrates retained exact-SHA runtime proofs from protected producer workflows. On main SHA `4d7dfbbd713806bfa8c336218175dc0f969ef792`, the gate captured an early snapshot before several retained producers reached their terminal state. The later Step-Up proof succeeded for the same SHA, but the already-completed gate remained stale and the downstream readiness scorecard continued to observe the older gate result.

The scorecard stabilizer already debounced material workflow storms, but its producer inventory omitted five workflows consumed by the Enterprise Production Gate: Upload Security, Audit Chain, Production Provider, Step-Up and Stripe Runtime Evidence Promotion. It also dispatched the scorecard directly after producer quieting without first proving that the production gate itself covered the newest producer state.

## Decision

The terminal scorecard stabilizer now:

1. tracks the complete retained-proof producer set used by the Enterprise Production Gate;
2. excludes the Enterprise Production Gate from the upstream quiet-window calculation so it can be refreshed as the fan-in boundary;
3. compares the latest upstream producer completion with the creation time of the newest exact-SHA production gate;
4. explicitly dispatches the existing Enterprise Production Gate when the gate snapshot is older than the retained evidence;
5. waits for a terminal exact-SHA gate result within a bounded window;
6. rechecks that no upstream producer became active while the gate was settling and that `main` is still the target SHA;
7. dispatches the readiness scorecard only after a terminal production gate covers the newest material producer state.

A failed production gate still counts only as a fresh terminal snapshot. It does not become a passing control. The readiness scorecard remains responsible for interpreting the evidence and stays fail-closed.

## Safety boundary

This orchestration change does not mutate Vercel, Supabase, Stripe, Sentry, repository rulesets, secrets or production data. It uses only bounded GitHub Actions read access plus workflow dispatch permission. It does not auto-promote Stripe evidence, bypass protected environments, synthesize human review, or downgrade any acceptance criterion.

If `main` advances, producer inventory is ambiguous, a material producer becomes active again, or no exact-SHA terminal production gate can be proven, the stabilizer refuses to dispatch the scorecard.

## Consequences

The terminal scorecard no longer depends on a race between retained proof completion and an earlier production-gate snapshot. Future successful protected proofs for Audit Chain, Provider, Branch Protection, Step-Up or Stripe can cause the fan-in to converge on a fresh gate and scorecard, while genuine external configuration failures remain visible as `NO_GO` instead of being hidden or repeatedly evaluated from stale evidence.
