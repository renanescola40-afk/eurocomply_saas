# Supabase staging rehearsal acceptance criteria

A rehearsal is accepted only when all conditions below are true for the exact current `main` SHA:

1. The source reconciliation workflow concluded successfully.
2. The source reconciliation artifact is bound to the same SHA.
3. No migration remains `REQUIRES_SPLIT_REVIEW`.
4. The staging and production project references are different.
5. The operator and approver are different people.
6. Every pending migration has a unique deterministic deploy order.
7. Every pending migration has staging and rollback references.
8. Every batch passes migration-history, schema, RLS, authenticated smoke and rollback checks.
9. Evidence references are non-empty and independently reviewable.
10. The sealed attestation reports `STAGING_REHEARSAL_PASSED`.

Failure of any condition keeps production blocked. Passing these conditions permits only preparation of a bounded production change request; it does not authorize execution.
