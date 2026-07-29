# Enterprise Restore Drill Evidence

## Purpose

This control prevents backup, restore and disaster-recovery readiness from being marked complete merely because a script, provider setting or runbook exists. Release-grade evidence is emitted only after a sanitized restore-drill record is bound to the exact current `main` SHA and passes every required recovery, security and integrity check.

## Ten integrated controls

1. exact-main SHA binding;
2. same-repository workflow provenance;
3. protected `production` environment approval;
4. isolated restore target requirement;
5. explicit no-production-mutation assertion;
6. RPO and RTO measurement;
7. schema and migration-history verification;
8. RLS, tenant-isolation and auth-boundary verification;
9. application smoke and cleanup verification;
10. redaction, independent approval and SHA-256 integrity promotion.

## Source artifact contract

The source workflow must upload exactly one artifact named `restore-drill-evidence` containing exactly one file named `restore-drill-evidence.json`.

The file must follow `restore-drill-evidence.schema.example.json`. Identifiers for the backup and isolated restore target must be irreversibly hashed before upload. Never upload database URLs, passwords, service-role keys, provider tokens, cookies, authorization headers or raw production records.

## Status boundary

- `Complete / passed`: the promotion workflow validated an approved sanitized source artifact for the exact current `main` SHA.
- `External validation required`: no approved source artifact exists for the exact current `main` SHA.
- `Rejected`: the source is stale, incomplete, non-isolated, production-mutating, unapproved, sensitive or inconsistent.

Repository tests validate only the contract. They do not prove that Supabase, Vercel or another provider executed a restore.

## Required operator sequence

1. Create a backup through the configured provider.
2. Restore into a new isolated non-production target.
3. Verify schema objects and migration history.
4. Verify RLS and forced-RLS state.
5. Run cross-tenant denial checks with synthetic test tenants.
6. Verify critical aggregate counts without exporting raw customer records.
7. Verify authentication and protected-route boundaries.
8. Run the application smoke suite against the isolated target.
9. Delete or quarantine the isolated target according to the retention policy.
10. Produce the sanitized JSON record and obtain independent approval.
11. Upload it as the required workflow artifact.
12. Run **Enterprise Restore Drill Evidence** with the source workflow run ID.

## Failure rules

Do not promote evidence when:

- the source SHA is not the current `main` SHA;
- the source workflow failed or came from another repository;
- any required check is false or missing;
- the restore target was not isolated;
- production was mutated during the drill;
- operator and approver independence is not confirmed;
- secrets or connection material appear in the artifact;
- RPO or RTO is absent;
- cleanup was not verified.

## Rollback

This control is additive and read-only. Revert the workflow, validator, tests and documentation. No provider or database state is modified by the promotion workflow.
