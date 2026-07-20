# Recovery resilience evidence contract

## Canonical evidence

- Rollback: `docs/security/evidence/runtime/rollback-validation.json`
- Backup/restore: `docs/security/evidence/p1/backup-restore-tested.json`

## Rollback acceptance

The rollback document may be `Complete/passed` only when:

- execution occurred in GitHub Actions on `main`;
- the current SHA is a full 40-character SHA;
- the protected confirmation phrase matched exactly;
- rollback target URL and SHA were configured;
- target URL and target SHA differed from the current release;
- the pinned Vercel CLI executed rollback;
- rollback status was checked;
- production `/api/health` returned healthy;
- post-rollback health returned `Cache-Control: no-store`;
- no failures remain.

## Backup/restore acceptance

The backup/restore document may be `Complete/passed` only when:

- execution occurred in GitHub Actions on `main`;
- source and isolated restore databases were distinct;
- `pg_dump` produced a non-empty custom-format backup;
- `pg_restore` completed in the isolated database;
- aggregate counts matched for critical tenant tables;
- RLS remained enabled on those tables;
- corresponding policies remained present;
- RPO and RTO were measured numerically;
- the dump was deleted and not uploaded;
- no failures remain.

## Prohibited evidence

Canonical evidence must never contain:

- Vercel tokens;
- database connection strings;
- deployment URLs;
- access tokens or cookies;
- raw HTTP response bodies;
- database row contents;
- full backup digests;
- database dumps.

## Scorecard mapping

Successful rollback evidence can satisfy REC-01 through REC-04 only after exact-SHA validation.
Successful backup/restore evidence can satisfy REC-05 through REC-10 only after exact-SHA validation.
Repository code, workflow presence, dry runs or documentation alone do not promote these controls.
