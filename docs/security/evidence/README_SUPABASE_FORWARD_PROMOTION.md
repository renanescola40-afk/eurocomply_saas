# Supabase forward production promotion — truth boundary

This note documents the repository-side security boundary for the manual `Supabase Forward Reconciliation Production Promotion` workflow.

It is not runtime evidence and it does not authorize production execution.

## What the workflow closes

The bounded forward reconciliation lane previously stopped after isolated rehearsal and a filtered remote dry-run. The repository therefore had no executor capable of applying exactly the reviewed forward set without exposing production to the unresolved historical migration backlog.

The production-promotion workflow closes that implementation gap by requiring exact-SHA rehearsal and dry-run provenance, rebuilding the filtered workdir from current remote history, verifying selected migration digests, repeating the filtered dry-run immediately before the write, applying exactly once, proving the remote migration-ledger transition, and running live read-only postconditions.

## What remains outside repository code

Production execution remains blocked until the live GitHub `Production` environment is hardened with administrator bypass disabled, at least one required deployment reviewer, protected-branches-only deployment policy and the rotated canonical Supabase pooler secret.

The `supabase-production-migration-dry-run` environment must independently satisfy the same governance boundary before rehearsal/dry-run evidence can be treated as protected production evidence.

The pooler credential incident tracked separately must be closed by provider-side rotation; repository code does not substitute for secret rotation.

## Prohibited claims

Merging this change does not mean the selected migrations were applied, production schema is reconciled, recovery passed, `/api/ready` passed, or the global release is GO.

Only a successful protected Stage 3 run for the exact current main SHA, together with its post-write ledger and live-postcondition evidence, may establish that the selected bounded set was promoted.
