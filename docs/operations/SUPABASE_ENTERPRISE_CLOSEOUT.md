# Supabase enterprise closeout

## Purpose

This runbook closes the Supabase and data-security domain without treating repository code as production evidence. A control is complete only when implementation, tests, runtime validation, evidence, owner and recovery procedure all exist.

## Scope delivered by this Mega PR

- Deterministic verification of the production RLS reconciliation proof.
- Acceptance of PostgreSQL boolean renderings such as `true` and `t`.
- Hard failure when required RLS, FORCE RLS, policies or migration history are absent.
- Hard failure when `stripe_webhook_events` receives a client-readable policy.
- Unit tests for positive and negative proof cases.
- Immutable 90-day workflow artifacts with SHA-256 checksums.
- Explicit runtime closeout checklist for drift, schema, tenant isolation, backup and restore.

## Required runtime sequence

Run only from the trusted `main` tip and use the exact 40-character SHA.

1. Run **Supabase Production RLS Reconciliation** with confirmation `APPLY_RLS_RECONCILIATION`.
2. Confirm the `verification.json` artifact reports `PASS`.
3. Run **Supabase Migration Drift Audit** and retain its artifact.
4. Run **Supabase Production Schema Evidence** with confirmation `COLLECT_SUPABASE_SCHEMA_EVIDENCE`.
5. Run the live tenant-isolation validation using controlled test tenants.
6. Confirm a current Supabase backup exists in the correct production project.
7. Perform a restore drill in an isolated non-production project or approved recovery environment.
8. Attach the artifact IDs, run URLs, tested SHA, environment and owner to the release evidence pack.

## Completion gates

| Gate | Required evidence | Owner | Status before runtime |
| --- | --- | --- | --- |
| Production RLS | Reconciliation artifact and `verification.json=PASS` | Database owner | Pending execution |
| Migration drift | Drift audit JSON and Markdown | Release owner | Pending execution |
| Production schema | Catalog artifact and SHA-256 | Database owner | Pending execution |
| Tenant isolation | Live SELECT/INSERT/UPDATE/DELETE evidence | Security owner | Pending execution |
| Backup | Provider screenshot/export with timestamp and retention | Database owner | Human validation required |
| Restore | Restore drill record with RTO/RPO observations | Incident owner | Human validation required |
| Release binding | Exact main SHA recorded in every artifact | Release manager | Enforced by workflows |

## Safety boundaries

- Do not use `supabase db push --include-all` to bypass migration drift.
- Do not mark migrations as applied without object-level evidence.
- Do not run destructive reconciliation automatically.
- Do not expose the Session Pooler URL, database password or service-role key in logs.
- Do not run restore drills against the active production project.
- A green repository check is not a substitute for runtime evidence.

## Final decision

The Supabase domain may be marked 100% only when every gate above has real evidence attached to the same approved release SHA. Until then, code readiness can be complete while operational readiness remains pending.
