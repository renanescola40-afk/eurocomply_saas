# Stripe Entitlement Runtime Proof

## Objective

Prove, for one exact release SHA and one observed Stripe test-mode event, that the verified webhook path produced the expected entitlement snapshot and canonical seat policy, then automatically promote only that successful sanitized proof into the P0 evidence format.

## Preconditions

- the target release SHA is the current tip of `main`;
- the protected target environment contains `SUPABASE_DB_POOLER_URL` as a PostgreSQL URI;
- the Stripe webhook secret and endpoint are configured outside this workflow;
- the selected Stripe event has already been delivered and processed;
- the event metadata includes the expected organization, source, plan and seat limits;
- test mode is confirmed.

## Execution

Run **Stripe Entitlement Runtime Proof** manually and provide:

- exact release SHA;
- target environment;
- Stripe event ID;
- organization UUID;
- expected plan code;
- expected full, participant and viewer seat limits;
- test-mode confirmation;
- confirmation phrase `PROVE_STRIPE_ENTITLEMENT_RUNTIME`.

The runtime-proof workflow remains manual because the operator must deliberately choose a real Stripe test-mode event and the exact organization/limits that should be correlated. A workflow must not invent those facts merely to make the enterprise score green.

## Verified chain

1. `stripe_events_processed` contains the event with `processed` status and the expected organization.
2. `enterprise_entitlement_snapshots` contains `stripe:<event id>`.
3. snapshot plan and limits match the expected values.
4. the latest `enterprise_seat_policies` row matches the expected limits.
5. the reconciliation ledger contains an applied or idempotent result.
6. replay validation proves the same event is treated as a duplicate without creating a second snapshot, policy version or reconciliation.

## Automatic evidence promotion

A successful **Stripe Entitlement Runtime Proof** on `main` automatically triggers **Stripe Runtime Evidence Promotion** through `workflow_run`.

The promotion job does not trust the trigger name alone. It independently verifies:

- the source run ID is numeric and is exactly the triggering run;
- the source workflow path is `.github/workflows/stripe-entitlement-runtime-proof.yml`;
- the source run was `workflow_dispatch`, completed successfully and ran on `main`;
- the source `head_sha` equals the release SHA;
- the release SHA is still the exact current `main` SHA;
- exactly one non-expired artifact exists with name `stripe-entitlement-runtime-proof-<SHA>`;
- the retained source proof is Stripe test mode, contains no sensitive values and has all correlation + replay checks passing;
- replay safety passes again before promotion;
- the promoted evidence passes the authoritative Stripe P0 validator for the exact SHA.

The source artifact is fetched through the GitHub REST API and extracted by exact filenames. The promotion workflow does not use a floating `actions/download-artifact` dependency.

A manual **Stripe Runtime Evidence Promotion** dispatch remains available only as a recovery path and requires the phrase `PROMOTE_STRIPE_RUNTIME_EVIDENCE` plus the exact source runtime-proof run ID.

## Privacy and evidence handling

The raw read-only catalog is deleted before the runtime-proof artifact is uploaded. The retained source artifact contains only identifier suffixes, expected plan/limits, booleans, SHA-256 integrity data and explicit truth boundaries.

The automatic promotion consumes only sanitized `evidence.json` and `replay.json`. It does not download or persist raw database catalogs, Stripe secrets, webhook payloads, customer data or database credentials.

## Failure handling

A failed runtime-proof or promotion workflow is not evidence of alignment. Investigate in this order:

1. event signature and delivery;
2. event processing status;
3. organization binding;
4. metadata validation;
5. source version or priority conflict;
6. entitlement snapshot creation;
7. seat-policy application;
8. reconciliation result;
9. replay/idempotency stability;
10. source-run/artifact provenance;
11. database migration state.

If the source runtime proof is valid but automatic promotion fails, do not edit the promoted JSON by hand. Fix the provenance/validator problem and rerun the promotion recovery workflow against the same successful exact-SHA source run if the release SHA is still current `main`.

## Rollback

Disable Stripe entitlement publication while preserving core billing processing. Keep event, snapshot and reconciliation evidence. Restore the last-known-good seat policy only through the reviewed reconciliation path.

## Truth boundary

A passing runtime proof plus automatic promotion proves only the observed test-mode event, expected organization, replay behavior and exact release SHA. It does not prove all future events, production load capacity, signed-contract correctness or every organization.
