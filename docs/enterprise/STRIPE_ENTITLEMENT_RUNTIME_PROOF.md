# Stripe Entitlement Runtime Proof

## Objective

Prove, for one exact release SHA and one observed Stripe test-mode event, that the verified webhook path produced the expected entitlement snapshot and canonical seat policy.

## Preconditions

- the target release SHA is the current tip of `main`;
- the protected target environment contains `SUPABASE_PROJECT_ID` and `SUPABASE_DB_PASSWORD`;
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

## Verified chain

1. `stripe_events_processed` contains the event with `processed` status and the expected organization.
2. `enterprise_entitlement_snapshots` contains `stripe:<event id>`.
3. snapshot plan and limits match the expected values.
4. the latest `enterprise_seat_policies` row matches the expected limits.
5. the reconciliation ledger contains an applied or idempotent result.

## Privacy and evidence handling

The raw read-only catalog is deleted before artifact upload. The retained artifact contains only identifier suffixes, expected plan/limits, booleans, SHA-256 integrity data and explicit truth boundaries.

## Failure handling

A failed workflow is not evidence of alignment. Investigate in this order:

1. event signature and delivery;
2. event processing status;
3. organization binding;
4. metadata validation;
5. source version or priority conflict;
6. entitlement snapshot creation;
7. seat-policy application;
8. database migration state.

## Rollback

Disable Stripe entitlement publication while preserving core billing processing. Keep event, snapshot and reconciliation evidence. Restore the last-known-good seat policy only through the reviewed reconciliation path.

## Truth boundary

A passing run proves only the observed event, expected organization and exact release SHA. It does not prove all future events, production load capacity, signed-contract correctness or every organization.
