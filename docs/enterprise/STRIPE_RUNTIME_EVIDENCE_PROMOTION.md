# Stripe Runtime Evidence Promotion

## Objective

Promote a sanitized Stripe entitlement runtime proof into a release-grade evidence artifact only after exact-SHA, correlation, replay and redaction checks pass.

## Required sequence

1. Merge the runtime-proof implementation to `main`.
2. Deliver a signed Stripe test-mode event to the configured target deployment.
3. Run the protected runtime proof for the exact current `main` SHA.
4. Capture event, entitlement snapshot, canonical seat policy and reconciliation ledger correlation.
5. Replay the same Stripe event ID.
6. Prove that the second delivery is duplicate and does not create a new snapshot, policy version or reconciliation entry.
7. Run `Stripe Runtime Evidence Promotion` with the source workflow run ID.
8. Retain the promoted evidence artifact and checksum for release review.

## Fail-closed rules

Promotion fails when:

- the source SHA differs from current `main`;
- the proof is not Stripe test mode;
- any correlation is absent;
- raw evidence was retained;
- sensitive values are present;
- replay changes snapshot count, policy version, seat limits or reconciliation count;
- the source artifact is missing or renamed;
- the protected environment does not approve execution.

## Truth boundary

A promoted artifact proves one observed test-mode event for one organization and one exact release SHA. It does not prove all organizations, all Stripe event types or future deployments.
