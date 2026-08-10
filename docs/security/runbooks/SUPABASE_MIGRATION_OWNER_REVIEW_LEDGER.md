# Supabase Migration Owner-Review Ledger Guard

## Purpose

Prevent human-review progress from being inflated by duplicate batch rows, stale filenames, digest drift, or unresolved historical provenance.

This control sits **before** generation of any next human-review batch. It does not replace the canonical migration reconciliation Decision Gate.

## Current protected-lineage state

- Immutable reconciliation subject SHA: `def59573bf2dbd2ad447f8f493048b0296be21ff`
- Inventory SHA-256: `cd453965b7e93b5ca5853838db1ba2ce561650fd30e865655f60891439158122`
- Inventory size: `211`
- Documented unique owner-reviewed progress after Mega Batch N: `145/211`
- Documented remaining unique inventory: `66/211`
- Canonical Decision Gate: `NOT ACCEPTED FOR STAGING`
- Independent approver: pending

The repository has already needed one manual ledger correction after Mega Batch L because nine reviewed rows reaffirmed filenames that had been credited earlier. The guard exists so reaffirmations cannot increase the numerator again.

## Input contract

`scripts/supabase/build-migration-owner-review-ledger.mjs` consumes:

1. the exact retained `migration-reconciliation-inventory.json`;
2. a normalized owner-review record set with schema `risck-comply.supabase-migration-owner-review-records.v1`.

Every exact owner-review record must include:

- immutable migration filename;
- SQL SHA-256 matching the inventory;
- one supported reconciliation classification;
- source evidence path;
- human reviewer identity;
- human review timestamp.

Historical credit whose exact immutable fingerprint cannot yet be reconstructed belongs in `unresolvedCredits`; it must never be guessed.

## Fail-closed rules

The ledger blocks when:

- the inventory schema is wrong;
- the review-record schema is wrong;
- inventory SHA-256 does not match;
- a reviewed filename does not exist in the immutable inventory;
- SQL SHA-256 differs from the immutable inventory;
- a classification is unsupported;
- the same immutable file has conflicting classifications;
- reviewer/source/timestamp attribution is missing;
- unresolved credit exceeds the unmatched inventory;
- the documented reviewed total does not reconcile.

An exact reaffirmation with the same filename, SQL digest and classification is retained as provenance but contributes **zero additional numerator credit**.

## Unresolved historical provenance

The current review history contains a known provenance gap: Mega Batch H consolidates two valid current-inventory credits from Mega Batch E, but the standalone Batch-E record with the two exact immutable filenames/digests has not been reconstructed from the protected repository history available to this control.

Until those two exact fingerprints are recovered and normalized, the ledger status must remain:

`PROVENANCE_RECONSTRUCTION_REQUIRED`

and:

`nextBatchSelectionAuthorized = false`

This is intentionally stricter than selecting 15 apparently unreviewed filenames and risking another duplicate-credit error.

The human-review classifications recorded in later batches remain evidence; this guard does not revoke them. It only prevents a machine-generated next batch from claiming collision-free selection until provenance is exact.

## Usage

```bash
node scripts/supabase/build-migration-owner-review-ledger.mjs \
  artifacts/supabase-migration-drift/migration-reconciliation-inventory.json \
  artifacts/supabase-migration-owner-review/owner-review-records.json \
  artifacts/supabase-migration-owner-review-ledger/ledger.json \
  --batch-size=15
```

Exit behavior:

- `READY_FOR_NEXT_HUMAN_REVIEW_BATCH`: exit `0`, bounded next batch emitted with blank decision/reviewer fields;
- `OWNER_REVIEW_CLASSIFICATION_COMPLETE`: exit `0`, no next batch required;
- `PROVENANCE_RECONSTRUCTION_REQUIRED`: exit `2`, next batch withheld;
- `BLOCKED`: exit `2`, blockers must be resolved.

## Required workflow before Batch O

1. Download the exact retained inventory for subject SHA `def59573...`.
2. Normalize the owner-reviewed records from the protected F-through-N evidence lineage into exact filename + SQL SHA-256 records.
3. Recover the two Batch-E immutable fingerprints from trustworthy evidence. Do not infer them from the remaining set.
4. Run the ledger guard.
5. Require `unresolvedCredits = 0`.
6. Require `status = READY_FOR_NEXT_HUMAN_REVIEW_BATCH`.
7. Only then use `nextHumanReviewBatch` as non-crediting preparation material for the next human review.

## Truth and safety boundary

This ledger does **not**:

- classify a migration automatically;
- accept a candidate classification;
- create reviewer or approver identity;
- resolve `REQUIRES_SPLIT_REVIEW`;
- authorize `supabase migration repair`;
- authorize staging;
- execute SQL;
- execute migrations;
- mutate migration history;
- authorize `supabase db push`;
- mutate schema or customer data;
- authorize production.

Even when all owner-review provenance is exact, the canonical Decision Gate still requires its own classification-specific evidence, complete sealed decisions, zero unresolved split-review items, and a distinct independent approver.
