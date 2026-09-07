# Supabase production migration deployment

## Purpose

Keep the production Supabase schema synchronized with reviewed SQL while preserving one governed production writer, exact-SHA provenance and fail-closed approval boundaries.

The read-only drift audit, exact selected migration set, rehearsal, bounded dry-runs and human Decision Gate must complete before any production database write is eligible.

## Single production writer

The only repository workflow authorized to apply the current forward-reconciliation package is:

`.github/workflows/supabase-forward-reconciliation-production-promotion.yml`

`Supabase Production Migrations (Legacy Guard)` is intentionally non-writing. It exists only to prevent an operator from mistaking the historical entry point for an authorized promotion path. It receives no database secrets, never runs `supabase db push`, and fails closed with instructions to use the canonical promotion workflow.

Do not restore a second production writer.

## Canonical GitHub environment secrets

Configure production database credentials only in the protected environments that genuinely require them, including the canonical `Production` promotion environment and read-only/dry-run environments where applicable:

- `SUPABASE_PROJECT_ID`: the exact production project reference where a workflow explicitly requires it;
- `SUPABASE_DB_POOLER_URL`: the complete Session Pooler URI copied from **Supabase → Connect** for that project, including the current database password.

`SUPABASE_DB_POOLER_URL` is the canonical database endpoint and credential. Do not duplicate the same authority into public variables, workflow inputs, repository files, logs, screenshots, issue bodies or unrelated environments.

### Creating the canonical URI

1. Open the exact production project in Supabase.
2. Select **Connect → Session Pooler**.
3. Copy the URI using port `5432` and username `postgres.<project-ref>`.
4. Replace the password placeholder with the current database password when required by the dashboard.
5. Store it only as the protected `SUPABASE_DB_POOLER_URL` secret for the workflows that need it.
6. Never paste the credential into workflow inputs, issues, logs or public Vercel variables.

## Credential rotation

When the Supabase database password changes:

1. copy a fresh Session Pooler URI from the same production project;
2. replace `SUPABASE_DB_POOLER_URL` in every protected GitHub environment that legitimately uses production database workflows;
3. rerun the read-only drift and bounded dry-run chain;
4. do not start a production write until the exact-SHA evidence chain can authenticate again.

A structurally valid connection that returns `SQLSTATE 28P01` contains a password rejected by the database. Waiting does not turn an invalid credential into evidence.

## Canonical production controls

The forward-reconciliation production-promotion workflow must preserve all of these controls:

1. exact current protected `main` SHA;
2. successful exact-SHA rehearsal provenance;
3. successful exact-SHA forward dry-run provenance;
4. successful bounded Production dry-run evidence;
5. successful Decision Gate provenance and immutable decision subject SHA;
6. protected `Production` environment governance before database secrets are released;
7. exact confirmation string binding the release SHA, dry-run run and Decision Gate run;
8. recompilation of the current manifest and exact selected migration digests;
9. a fresh filtered workdir built from current production migration history;
10. proof that every selected version is forward-only and the pending set equals the selected set;
11. a final filtered `supabase db push --dry-run` immediately before promotion;
12. revalidation of current `main`, bounded S3 evidence and accepted human approval immediately before the irreversible write;
13. application of only the filtered selected migration set;
14. capture of the exact remote ledger transition;
15. read-only live schema/security postconditions;
16. detection of any `main` movement after promotion so release evidence cannot be reused for a newer SHA.

The manifest itself is never production-write authority. `productionWriteAuthorizedByConfig` must remain `false`.

Migration-history repair, unrestricted `db push`, `--include-all`, database reset, synthetic ledger insertion and automatic confirmation remain prohibited.

## Migration history reconciliation

Never bypass migration-history divergence by renaming or deleting files blindly, running `--include-all`, or marking local migrations as applied.

Use this sequence:

1. Run **Supabase Migration Drift Audit** on the exact current `main` SHA.
2. Preserve its artifact even when it concludes fail-closed after producing a complete inventory.
3. Run the canonical forward reconciliation compile/rehearsal chain for the same SHA.
4. Require the selected migration bytes and version order to be deterministic.
5. Complete staging/S1 rehearsal where required.
6. Complete the forward dry-run.
7. Complete the bounded Production dry-run used by the Decision Gate.
8. Complete independent human Decision Gate review of the exact selected set.
9. Invoke the protected canonical production-promotion workflow with those exact run IDs and subject SHA.
10. After promotion, rerun drift, RLS, tenant isolation, recovery, runtime and application smoke evidence on the exact release SHA.

## Manual read-only dry-run

Open **Actions → Supabase Production Migration Dry Run → Run workflow** from `main`.

Provide the exact release SHA and the workflow's required read-only confirmation. A blocked deployability result is valid evidence while governance or historical reconciliation is incomplete; the run must not mutate production.

## Manual production execution

Do **not** use `Supabase Production Migrations (Legacy Guard)` to deploy. A failed legacy-guard run is expected and means the safety control is working.

Use **Actions → Supabase Forward Reconciliation Production Promotion → Run workflow** only when all prerequisite evidence exists for the exact current `main` SHA.

Provide:

- `release_sha`: the exact current protected `main` SHA;
- `rehearsal_run_id`: the successful exact-SHA rehearsal run;
- `dry_run_run_id`: the successful exact-SHA forward dry-run run;
- `decision_run_id`: the successful Decision Gate run;
- `decision_subject_sha`: the immutable subject SHA approved by that Decision Gate;
- `confirmation`: the exact confirmation string required by the canonical workflow.

The protected `Production` environment must preserve its required human review/governance before secrets are released. Repository configuration or a filename allowlist is not sufficient production-write authorization.

## Validation after deployment

Confirm that:

- the exact selected versions appear in Supabase migration history and no unauthorized migration was applied;
- expected columns, constraints, functions, grants and policies exist;
- RLS and tenant-isolation proofs pass;
- health, readiness and authenticated smoke tests pass;
- provider/runtime evidence is bound to the exact promoted SHA;
- billing and entitlement operations remain healthy when touched;
- artifacts contain no credentials or customer data.

## Rollback

SQL migrations are forward-only by default. Never run a production database reset.

For a failed rollout:

1. stop or isolate the affected feature when necessary;
2. preserve current database and runtime evidence;
3. create and independently review a compensating migration;
4. pass that compensating change through the same governed rehearsal, dry-run, Decision Gate and protected promotion chain;
5. validate data integrity, RLS and application runtime;
6. record the incident, exact SHAs, migration versions, operators, approvals and evidence digests.
