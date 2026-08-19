# Supabase Forward Production Acceptance

## Purpose

This is **Stage 4** of the bounded Supabase forward-reconciliation lane. It does not deploy migrations. It accepts an already successful protected production promotion only after fresh live evidence proves that the promoted state still matches the reviewed release.

A successful Stage 3 promotion is necessary but not sufficient for final database acceptance. Stage 4 binds the same exact release SHA and selection digest across human review, production ledger transition, fresh live schema/security postconditions, live tenant isolation, migration drift and protected backup/restore evidence.

## Required inputs

Dispatch `Supabase Forward Production Acceptance` with:

1. `release_sha` — exact current `main` SHA;
2. `promotion_run_id` — successful `Supabase Forward Reconciliation Production Promotion` workflow-dispatch run for that SHA;
3. `recovery_run_id` — successful `Recovery Resilience Proof` workflow-dispatch run for that SHA that contains `backup-restore-tested.json` (the `backup-restore` or `full` exercise satisfies this requirement);
4. exact confirmation `ACCEPT <release_sha> AFTER PROMOTION <promotion_run_id> AND RECOVERY <recovery_run_id>`.

The workflow is admitted through the protected `Production` environment before the database pooler secret is available.

## What Stage 4 proves

### 1. Exact source provenance

The workflow requires both source runs to:

- be `workflow_dispatch` runs;
- have `head_sha` equal to the supplied exact current `main` SHA;
- come from the canonical promotion/recovery workflows;
- have conclusion `success`.

It downloads the exact source artifacts by run ID and artifact name. Filename coincidence or evidence from another commit is not accepted.

### 2. Human-reviewed bytes equal promoted bytes

The current forward manifest is recompiled from the exact current release SHA. Stage 4 requires the source promotion manifest, human approval proof and promotion transition to carry the same selection digest and SHA.

`verify-forward-production-acceptance.mjs` independently requires the human-reviewed migration filename + SHA-256 set to equal the current selected manifest, and the applied migration versions to equal that same selected set.

The human Decision Gate remains non-authorizing by itself. Stage 4 does not create or infer reviewer decisions.

### 3. No post-promotion migration drift

Stage 4 re-reads `supabase_migrations.schema_migrations` from live production and compares it to the exact `remote-after.json` captured by the successful Stage 3 promotion.

Any additional migration, missing migration, malformed version or mismatch fails acceptance. No migration-history repair or write is attempted.

### 4. Fresh live schema/security postconditions

The canonical `scripts/supabase/verify-forward-reconciliation-postconditions.sql` is executed again against production. It is used only as a read-only postcondition assertion and must succeed before an exact-SHA live-postcondition artifact is emitted.

This prevents Stage 4 from relying solely on the observation made inside the earlier promotion run.

### 5. Live tenant A/B RLS behavior without synthetic production data

`scripts/supabase/assert-live-tenant-isolation-read-only.sql` executes inside `BEGIN TRANSACTION READ ONLY` and finishes with `ROLLBACK`.

It:

- selects two **already-existing** Auth users in mutually foreign organizations;
- does not create users, organizations, memberships, Evidence rows or Storage objects;
- assumes the `authenticated` PostgreSQL role;
- sets only transaction-local JWT claim context;
- requires actor A to see its own organization and membership but not actor B's foreign organization/member row;
- repeats the proof in the opposite direction for actor B;
- requires RLS + FORCE RLS on the canonical organization and Evidence Vault metadata boundaries;
- requires the private Evidence Storage policy boundary and no authenticated hard-delete privilege;
- retains no user ID, organization ID or row data in the evidence artifact.

If production does not contain a safe mutually foreign pair of existing actors, Stage 4 fails closed rather than creating synthetic production fixtures.

### 6. Exact-SHA database recovery evidence

The successful source Recovery run must contain `backup-restore-tested.json` with schema `risck-comply.backup-restore-evidence.v2`, exact target/observed SHA, the same Recovery workflow run ID and all REC-05 through REC-10 checks passing.

This proves the protected backup/restore boundary for the exact release. It does **not** prove provider-side revocation of a previously exposed database credential.

## Final artifact

A successful Stage 4 produces:

`supabase-forward-production-acceptance-<release_sha>`

The retained artifact contains only:

- current exact-SHA selected manifest;
- fresh live migration-version list;
- fresh read-only live postcondition proof;
- sanitized live tenant-isolation proof;
- final production-acceptance proof.

The workflow scans retained evidence and fails if it finds a database URL, Supabase pooler endpoint, JWT-like value, UUID-shaped tenant/user identifier or similar forbidden value.

## What `Complete/passed` means

`production-acceptance.json = Complete/passed` means:

- the selected forward migration bytes were independently human reviewed;
- those exact selected versions were the versions promoted;
- the production migration ledger has not drifted since the captured promotion state;
- fresh live schema/security postconditions pass;
- live authenticated two-tenant SELECT isolation passes in both directions using existing actors only;
- exact-SHA protected backup/restore evidence passes;
- acceptance itself performed no production data/schema mutation.

## Explicit non-claims

Stage 4 **does not**:

- classify the historical migration backlog;
- repair or rewrite migration history;
- execute `db push`, `--include-all` or direct migration SQL;
- create synthetic production tenants or rows;
- prove provider-side credential rotation/revocation;
- close #1620 solely from repository/workflow evidence;
- claim global Enterprise 100% or unrelated Billing/Product/provider acceptance.

The previously exposed database credential tracked by **#1620** still requires genuine provider-side evidence that the old credential was rotated/revoked and all authorized consumers were rebound. A passing backup/restore run proves the current protected recovery path works; it **does not prove** that the old provider credential can no longer authenticate.

## Required sequence after this code is merged

For the new exact current `main` SHA:

1. run protected Recovery Resilience Proof in `backup-restore` mode;
2. run the bounded isolated reconciliation rehearsal;
3. run the filtered production dry-run;
4. complete the protected human migration Decision Gate for the exact selected bytes;
5. run the human-approved bounded production promotion;
6. run this Stage 4 production acceptance with the successful promotion and recovery run IDs;
7. retain #1620 as a provider-side blocker until rotation/revocation evidence exists.

Any movement of `main`, migration byte change, selection change, production ledger change or failed live postcondition invalidates acceptance and requires a new exact-SHA evidence chain.
