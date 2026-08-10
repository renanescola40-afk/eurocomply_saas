# Supabase Migration Owner-Review Ledger Guard

## Purpose

Prevent human-review progress from being inflated by duplicate batch rows, stale filenames, digest drift, conflicting classifications, or opaque historical credits.

This control sits **before** generation of any next human-review batch. It does not replace the canonical migration reconciliation Decision Gate.

## Current protected-lineage state

- Immutable reconciliation subject SHA: `def59573bf2dbd2ad447f8f493048b0296be21ff`
- Inventory SHA-256: `cd453965b7e93b5ca5853838db1ba2ce561650fd30e865655f60891439158122`
- Source workflow run: `31361564127`
- Source artifact ID: `9052542299`
- Inventory size: `211`
- Historical documented owner-review claim after Mega Batch N: `145/211`
- Strict exact-fingerprint owner-review baseline: `143/211`
- Exact-fingerprint remaining inventory: `68/211`
- Batch-E opaque historical claims: `2`, quarantined and non-crediting
- Canonical Decision Gate: `NOT ACCEPTED FOR STAGING`
- Independent approver: pending

The repository already required a manual correction after Mega Batch L because nine reviewed rows reaffirmed filenames credited earlier. The guard therefore calculates progress from immutable filename + SQL SHA-256 fingerprints, never raw batch-row arithmetic.

## Evidence normalization

`scripts/supabase/normalize-migration-owner-review-evidence.mjs` reconstructs the exact F-through-N human-review lineage from repository evidence and the immutable reconciliation inventory.

Expected contract:

- review rows parsed from F-N: `152`;
- exact unique filenames: `143`;
- exact reaffirmations: `9`;
- Batch-E opaque historical claims: `2`, represented as `QUARANTINED_NON_CREDITING`;
- automatic classifications: `0`.

The normalizer fails closed if:

- an expected evidence file is missing;
- an expected batch row disappears;
- an evidence filename is absent from the immutable inventory;
- an inventory SQL digest is malformed;
- duplicate evidence assigns conflicting classifications;
- the expected `152 → 143 + 9` reconciliation no longer holds.

The generated owner-review record set uses schema:

`risck-comply.supabase-migration-owner-review-records.v1`

## Exact-review ledger input contract

`scripts/supabase/build-migration-owner-review-ledger.mjs` consumes:

1. the exact retained `migration-reconciliation-inventory.json`;
2. the normalized owner-review record set.

Every exact owner-review record must include:

- immutable migration filename;
- SQL SHA-256 matching the inventory;
- one supported reconciliation classification;
- source evidence path;
- human reviewer identity;
- human review date/timestamp.

### Two different historical-provenance states

`unresolvedCredits` means an opaque historical item still claims numerator credit. Any such record blocks next-batch generation with:

`PROVENANCE_RECONSTRUCTION_REQUIRED`

`quarantinedHistoricalCredits` means an opaque historical statement is preserved but explicitly contributes **zero** exact-fingerprint numerator credit. Every quarantined item must use:

`creditPolicy = QUARANTINED_NON_CREDITING`

A quarantined claim does not block exact-set selection because it no longer consumes an unidentified inventory filename.

## Batch-E treatment

Mega Batch H preserves two current-inventory classification claims from Mega Batch E, but the standalone Batch-E record with the two exact immutable filenames and SQL SHA-256 values was not recovered from trustworthy retained evidence.

The repository therefore does **not** guess those filenames.

Instead:

- historical claim arithmetic remains visible as `145/211`;
- the strict exact-fingerprint numerator is `143/211`;
- Batch E contributes `0` exact-fingerprint credit while quarantined;
- exact unmatched inventory is `68/211`;
- machine selection may proceed from the exact set;
- if an old Batch-E migration is encountered again, explicit exact human review may credit that fingerprint once;
- reconstructing trustworthy Batch-E fingerprints later may replace quarantine with exact records, but deduplication still prevents double credit.

This policy is stricter than assuming the historical `145/211` numerator is fingerprint-complete and safer than blocking all future review indefinitely.

## Fail-closed ledger rules

The ledger blocks when:

- inventory schema is wrong;
- review-record schema is wrong;
- inventory SHA-256 does not match;
- a reviewed filename does not exist in the immutable inventory;
- SQL SHA-256 differs from the immutable inventory;
- a classification is unsupported;
- the same immutable file has conflicting classifications;
- reviewer/source/timestamp attribution is missing;
- a quarantined item lacks `QUARANTINED_NON_CREDITING`;
- claimed totals exceed the inventory;
- expected exact or historical totals do not reconcile.

An exact reaffirmation with the same filename, SQL digest and classification remains provenance but contributes **zero additional numerator credit**.

## Usage

Generate normalized records:

```bash
node scripts/supabase/normalize-migration-owner-review-evidence.mjs \
  artifacts/supabase-migration-drift/migration-reconciliation-inventory.json \
  artifacts/supabase-migration-owner-review/owner-review-records.json
```

Build the exact ledger and bounded next batch:

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
- `PROVENANCE_RECONSTRUCTION_REQUIRED`: exit `2`, unresolved credited claims still exist;
- `BLOCKED`: exit `2`, an integrity contract failed.

## GitHub Actions verification

`Supabase Owner Review Ledger Guard` re-downloads the retained exact-subject artifact from run `31361564127`, verifies:

- workflow identity;
- exact subject SHA;
- successful source run;
- inventory SHA-256;
- F-N parsing counts;
- `152` review rows;
- `143` exact unique filenames;
- `9` reaffirmations;
- `2` quarantined historical Batch-E claims;
- `68` exact unmatched filenames;
- `15` non-crediting next-batch items;
- blank decision/reviewer fields on every selected item.

The workflow also asserts that staging, migration execution, history mutation and production remain unauthorized.

## Mega Batch O

The current non-crediting preparation is:

`docs/security/evidence/human-review/supabase-migration-mega-batch-o-review-preparation.md`

It contains technical recommendations only.

Merging that preparation does **not** constitute owner classification. The owner decision must be explicit and preserved separately before any O-item can increase the exact-fingerprint numerator.

## Truth and safety boundary

This ledger and its normalizer do **not**:

- classify a migration automatically;
- convert technical recommendations into human decisions;
- infer owner approval from PR merge;
- create an independent approver;
- resolve `REQUIRES_SPLIT_REVIEW`;
- authorize `supabase migration repair`;
- authorize staging;
- execute SQL;
- execute migrations;
- mutate migration history;
- authorize `supabase db push`;
- mutate schema or customer data;
- authorize production.

Even after all owner classifications are fingerprint-complete, the canonical Decision Gate still requires classification-specific evidence, resolved split-review items, staging evidence where required, and a distinct independent approver.
