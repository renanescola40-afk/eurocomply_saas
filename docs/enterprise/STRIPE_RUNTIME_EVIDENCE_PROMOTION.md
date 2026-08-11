# Stripe Runtime Evidence Promotion

## Objective

Promote a sanitized Stripe entitlement runtime proof into a release-grade exact-SHA P0 evidence artifact only after correlation, replay, redaction and source-provenance checks pass.

The promotion stage is automatic after a successful protected Stripe runtime proof. The source runtime proof itself remains deliberately manual because it must be anchored to a real Stripe test-mode event and operator-confirmed organization/plan/seat expectations.

## Normal sequence

1. Merge the runtime-proof implementation to protected `main`.
2. Deliver a signed Stripe test-mode event to the configured target deployment.
3. Run **Stripe Entitlement Runtime Proof** for the exact current `main` SHA with the real event ID, organization UUID and expected plan/seat limits.
4. The source proof correlates processed event, entitlement snapshot, canonical seat policy and reconciliation ledger.
5. The source proof validates replay/idempotency using the same Stripe event ID.
6. On source workflow success, **Stripe Runtime Evidence Promotion** starts automatically through `workflow_run`.
7. The promotion independently fetches the exact source run/artifact and revalidates sanitized `evidence.json` plus `replay.json`.
8. The promotion emits a source-bound P0 evidence artifact and checksum for release review.
9. The P0 aggregator may consume only a successful exact-SHA promotion artifact.

## Source provenance requirements

Automatic promotion accepts only a source run that is:

- `.github/workflows/stripe-entitlement-runtime-proof.yml`;
- `workflow_dispatch`;
- on `main`;
- completed successfully;
- bound to the exact release SHA;
- identified by the exact numeric source workflow-run ID.

Exactly one non-expired artifact named `stripe-entitlement-runtime-proof-<SHA>` must exist. Archive extraction requires exactly one safe `evidence.json` and exactly one safe `replay.json` entry.

## Replay truth boundary

`evidence.json` proves the event/snapshot/policy/reconciliation correlation. The replay/idempotency proof is intentionally separate in `replay.json`.

Promotion derives replay safety only when all of these are true:

- the replay references the same event ID;
- the first delivery was processed;
- the second delivery was classified as duplicate;
- snapshot count did not increase;
- policy version did not change;
- seat limits did not change;
- reconciliation count did not increase.

The source `evidence.checks.replaySafe` placeholder is not treated as proof. This prevents promotion logic from confusing a pre-replay catalog field with the retained replay artifact.

## Promoted evidence provenance

The promoted artifact records:

- exact repository, branch and commit SHA;
- exact source runtime-proof run ID;
- exact source workflow path;
- exact source artifact name bound to the commit SHA;
- SHA-256 digest of the sanitized source correlation evidence;
- SHA-256 digest of the sanitized replay evidence;
- source catalog SHA-256 digest;
- all verified billing/replay controls;
- explicit non-sensitive evidence-integrity flags.

The authoritative Stripe P0 validator rejects a promoted artifact if any of these provenance bindings are absent or malformed.

## Automatic promotion fail-closed rules

Promotion fails when:

- the source run/workflow/event/branch does not match the protected producer contract;
- the source SHA differs from the requested release SHA or current `main`;
- the source runtime proof is not Stripe test mode;
- event/snapshot/policy/limits/reconciliation correlation is absent;
- raw evidence was not deleted;
- sensitive values are present;
- the source artifact is missing, expired, duplicated or renamed;
- archive entries are missing, duplicated or unsafe;
- replay changes snapshot count, policy version, seat limits or reconciliation count;
- source-run provenance cannot be bound to the promoted artifact;
- the authoritative exact-SHA Stripe validator rejects the promoted artifact;
- the protected production environment does not approve execution.

## Manual recovery

A manual `Stripe Runtime Evidence Promotion` dispatch remains available only when automatic promotion itself needs recovery. It requires:

- exact current `main` SHA;
- exact successful source Stripe runtime-proof run ID;
- confirmation `PROMOTE_STRIPE_RUNTIME_EVIDENCE`.

Manual recovery uses the same source-run fetcher, correlation/replay validation, provenance binding and authoritative P0 validator. It is not a bypass.

## Evidence handling

The promotion consumes only sanitized `evidence.json` and `replay.json`. It does not retain raw database catalogs, Stripe webhook payloads, Stripe secrets, database credentials, customer values or decrypted provider configuration.

The promoted artifact is retained with a checksum for 365 days. No evidence JSON should be manually edited to turn a failed source proof or failed promotion into `Complete`.

## Truth boundary

A promoted artifact proves one observed Stripe test-mode event, the expected organization/plan/seat limits, replay behavior and one exact release SHA. It does not prove all organizations, all Stripe event types, production traffic capacity, future deployments or signed-contract correctness.
