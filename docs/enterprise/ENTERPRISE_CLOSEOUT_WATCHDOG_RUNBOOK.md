# Enterprise Closeout Watchdog Runbook

## Purpose

The watchdog provides a read-only, exact-SHA inventory of the enterprise runtime campaign. It answers four questions without promoting a score:

1. Which of the 13 canonical runtime lanes has a successful exact-main-SHA run?
2. Does that run retain the required non-expired artifact?
3. Has the safe bootstrap retained its promoted evidence bundle?
4. Have the protected recovery and assurance boundaries been completed before the full closeout?

The watchdog is observability, not an approval authority. The canonical readiness scorecard and the protected closeout workflows remain authoritative.

## Triggers

- hourly schedule at minute 17;
- completion of `Enterprise Safe Runtime Bootstrap`;
- completion of `Enterprise Runtime Closeout`;
- manual dispatch for the exact current `main` SHA.

A manually supplied SHA must equal the current `main` commit. Historical or feature-branch evidence is rejected.

## Decisions

- `AWAITING_SAFE_RUNTIME_EVIDENCE`: one or more safe lanes has no retained exact-SHA proof;
- `SAFE_CAMPAIGN_IN_PROGRESS`: a safe lane or safe bootstrap is queued or running;
- `AWAITING_SAFE_BOOTSTRAP`: every safe lane is complete but the bootstrap artifact is missing;
- `SAFE_BOOTSTRAP_BLOCKED`: the safe bootstrap failed or completed without its retained artifact;
- `SAFE_EVIDENCE_RETAINED`: all 11 non-destructive lanes and the safe bootstrap are complete;
- `GO_EVIDENCE_RETAINED`: all 13 lanes and the protected full closeout are complete.

`GO_EVIDENCE_RETAINED` means that the already-protected full closeout workflow succeeded and retained its artifact. The watchdog itself never creates GO, never computes a percentage and never authorizes rollback.

## Artifact

Workflow artifact:

`enterprise-closeout-watchdog-<40-character-main-sha>`

File:

`artifacts/enterprise-readiness/closeout-watchdog.json`

The artifact contains sanitized run IDs, states, conclusions, timestamps and artifact names. It excludes tokens, provider responses, logs, URLs, customer data and raw evidence bodies.

## Triage order

1. Fix `safe_runtime` blockers first.
2. If all 11 safe lanes are complete, repair or run the safe bootstrap.
3. Preserve the safe promotion artifact before touching protected boundaries.
4. Run Recovery only with explicit controlled-production authorization.
5. Attach real independent assurance evidence.
6. Run the protected full closeout on the exact current `main` SHA.

## Strict manual mode

Set `strict=true` only for an operator check that should fail unless either safe or full evidence has already been retained. Scheduled runs remain non-blocking so they continue publishing useful diagnostics while closeout is incomplete.

## Rollback

Revert the watchdog commit. This removes only read-only reporting and does not alter runtime lanes, evidence artifacts, environments, branch protection or the canonical scorecard.
