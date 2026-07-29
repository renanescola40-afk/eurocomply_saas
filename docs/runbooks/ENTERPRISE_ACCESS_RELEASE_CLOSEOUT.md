# Enterprise Access Release Closeout Runbook

## Before merge

1. Confirm the PR is based on the current `main`.
2. Require CI, Security CI, Full Security Suite, Production Gate, Scorecard and the focused closeout workflow.
3. Inspect any failure at the first failing job; do not repeatedly rerun deterministic failures.
4. Confirm no unresolved review thread weakens tenant isolation, approval separation, expiry, revocation or evidence retention.

## After merge

1. Verify the merge commit exists on `main`.
2. Confirm no open PR remains for this workstream.
3. Record external runtime items separately; do not reopen repository scope for evidence that requires production credentials or human execution.
4. Route future billing, product, design, marketing, legal and regulatory feature work to their owning workstreams.

## Regression response

If a future change breaks this gate, contain privileged elevation first, keep revocation and expiry available, restore the invariant, rerun focused tests and only then restore activation paths.
