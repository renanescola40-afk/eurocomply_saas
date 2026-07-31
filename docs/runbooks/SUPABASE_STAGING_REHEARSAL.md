# Supabase staging migration rehearsal

## Purpose

Validate the accepted migration reconciliation against an isolated production-like Supabase project before any production change request. This process is fail-closed and never authorizes an unrestricted `supabase db push`.

## Preconditions

- The exact current `main` SHA has a successful `Supabase Migration Reconciliation` artifact.
- Every migration is reviewed and classified.
- `REQUIRES_SPLIT_REVIEW` count is zero.
- The staging project ref and database URL are different from production.
- A staging backup or disposable clone exists.
- Operator and approver are different people.

## Execution model

1. Dispatch `Supabase Staging Rehearsal` with the successful reconciliation run ID.
2. Compile migrations into deterministic batches of at most 10.
3. Keep history-repair candidates separate from migrations whose SQL is genuinely pending.
4. Execute each batch manually in the approved staging window.
5. After every batch retain:
   - migration history before and after;
   - schema diff;
   - tenant-isolation/RLS result;
   - authenticated application smoke result;
   - rollback rehearsal evidence.
6. Complete the reviewed result JSON with the operator and independent approver.
7. Rerun the workflow to validate and seal the attestation.

## Stop conditions

Stop immediately when:

- staging resolves to the production project;
- a SQL digest differs from the reconciliation;
- migration order is duplicated or changes;
- a batch fails schema, RLS, smoke or rollback validation;
- operator and approver are the same person;
- the source SHA is no longer current `main`.

## Output

A passing run produces `STAGING_REHEARSAL_PASSED` for the exact SHA and immutable source/result digests. It does not authorize production execution. The next step is a separately approved bounded production change request with backup/PITR, maintenance window, incident commander and rollback owner.

## Prohibited shortcuts

- Do not use `supabase db push --include-all`.
- Do not point the rehearsal at production.
- Do not repair migration history without object-level proof.
- Do not treat repository checks as runtime evidence.
- Do not merge a hand-written `passed` JSON without workflow provenance.
