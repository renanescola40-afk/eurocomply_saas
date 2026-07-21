# ADR: Incremental promotion for non-destructive runtime evidence

- Status: Accepted
- Date: 2026-07-21
- Scope: Enterprise runtime evidence campaign and readiness promotion

## Context

The safe runtime campaign contains 11 non-destructive lanes. The original orchestrator processed them sequentially and returned `NO_GO` when any lane failed or remained blocked. The promotion closeout then required all 11 lanes to be complete before accepting any evidence.

This behavior was safe but operationally counterproductive:

- 11 sequential lanes, each with an independent timeout, could exceed the bootstrap timeout;
- one missing provider secret or protected-environment approval discarded valid exact-SHA evidence produced by unrelated lanes;
- operators could not promote a verified control until every other safe provider became available;
- the protected Recovery and Assurance boundaries were already excluded, so requiring atomic success across unrelated non-destructive lanes did not add release safety.

## Decision

The `safe` profile dispatches or reuses all allowlisted lanes before waiting for completion. Lane waits and artifact collection then run concurrently.

The campaign emits one of three decisions:

- `READY_FOR_SAFE_PROMOTION` when all 11 safe lanes complete;
- `READY_FOR_PARTIAL_SAFE_PROMOTION` when at least one safe lane completes and at least one remains blocked;
- `NO_GO` when no safe lane has promotable evidence.

The promotion closeout stages only completed safe lanes. Blocked lanes remain in the campaign report and remain open in the promoted scorecard. A partial closeout emits `PARTIAL_SAFE_EVIDENCE_PROMOTED` only when:

- every promoted lane is allowlisted in the safe profile;
- every promoted lane is complete/successful;
- retained artifact inventory is valid;
- exact repository, branch and SHA provenance match;
- the evidence manifest contains zero rejected evidence;
- at least one safe lane is promoted;
- Recovery, Assurance and `REL-10` are absent.

## Protected boundaries

The `full` profile remains all-or-nothing and sequential. It still requires explicit controlled rollback authorization, every registered lane, independent Assurance and the existing final-coherence rule.

Incremental safe promotion:

- never changes release decision to `GO`;
- never generates `REL-10`;
- never promotes Recovery or Assurance;
- never marks a blocked lane complete;
- never accepts a successful workflow without a retained validated artifact;
- never accepts a partial campaign with zero completed lanes;
- never reduces the canonical baseline score.

## Consequences

Valid technical evidence can increase the exact-SHA readiness score even when an unrelated provider or protected environment is blocked. The retained closeout explicitly records promoted and blocked lanes, so the remaining work stays reviewable.

The official score still changes only when the integrated bootstrap produces and retains an accepted exact-SHA promotion artifact. Merging this implementation alone promotes zero controls.

## Dependency validation

The exact-head release gates also require a moderate-level npm audit with no findings. The implementation keeps Next.js 15 intact while pinning patched transitive image processing and sanitization dependencies through the deterministic manifest and lockfile.

## Rollback

Revert the campaign profile, runner, promotion closeout, safe workflow, tests, dependency pins and runbook changes. This restores sequential, all-or-nothing safe promotion while preserving the protected full closeout.
