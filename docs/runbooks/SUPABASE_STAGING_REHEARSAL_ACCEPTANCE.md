# Supabase staging rehearsal acceptance criteria

A rehearsal is accepted only when all conditions below are true for the immutable **subject release SHA** and its evidence-only descendant commit:

1. The source `Supabase Migration Execution Plan` workflow concluded successfully.
2. The execution-plan artifact is bound to the subject SHA.
3. Subject SHA is an ancestor of the current evidence commit and the diff contains only canonical migration evidence files.
4. No migration remains `REQUIRES_SPLIT_REVIEW` upstream.
5. Every pending migration has a unique deterministic deploy order, exact SHA-256, schema evidence and rollback reference.
6. The generated staging plan is bound to the exact execution-plan artifact.
7. The reviewed staging result is bound to the exact staging-plan SHA-256 digest.
8. Staging and production project references are different.
9. Operator and approver are different people.
10. Every planned batch passes migration-history, schema, cross-tenant RLS, authenticated smoke and rollback checks.
11. Every evidence reference is non-empty and independently reviewable.
12. The sealed attestation reports `STAGING_REHEARSAL_PASSED` and contains the exact staged migration filename/SHA-256 set.

Failure of any condition keeps production blocked. Passing these conditions permits only preparation of a bounded production change request; it does not authorize execution.
