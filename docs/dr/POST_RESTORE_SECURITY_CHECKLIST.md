# Post-Restore Security Checklist — 2026-10-03

Target: dedicated non-production recovery project `golphfkmphanlntboxah`.

## Proven

- [x] Canonical migration history reaches the intended current recovery point: **113/113**.
- [x] Expected public-table count matches Production: **107/107**.
- [x] RLS is enabled on every recovered public table: **107/107**.
- [x] All foreign keys materialized in DR are validated: **0 unvalidated FKs**.
- [x] Production customer data was not copied into the disposable branch.
- [x] Branch reached final provider state `FUNCTIONS_DEPLOYED`.
- [x] Database migration-failure recovery path was exercised: real clean-replay failures were diagnosed and recovered in isolation.
- [x] Security advisors were reviewed after DDL/replay.
- [x] Performance advisors were reviewed after DDL/replay.
- [x] Current GitHub main and Vercel Production SHA alignment was revalidated.
- [x] Current and prior Vercel rollback candidates were identified without executing a Production rollback.

## Partially proven / requires exact-parity follow-up

- [~] Required indexes are present for the recovered canonical sequence, but exact index-count parity remains open: DR 334 / Production 417.
- [~] Required functions for the canonical sequence are present sufficiently for 113/113 replay, but exact function-count parity remains open: DR 127 / Production 134.
- [~] Required triggers for the canonical sequence are present sufficiently for replay, but exact trigger-count parity remains open: DR 68 / Production 73.
- [~] Foreign-key integrity in DR is validated, but exact FK-count parity remains open: DR 238 / Production 250.

## Not proven by this exercise

- [ ] Fresh Tenant A vs Tenant B runtime fixture under Auth/RLS. Attempted, but synthetic `auth.users` writes were blocked by the connected execution environment and were not bypassed.
- [ ] Actual production-data backup/PITR restore into the DR target.
- [ ] Production row-count/key-table comparison after backup restore.
- [ ] Supabase Storage object restore plus checksum verification.
- [ ] Recovered application deployment bound to the DR Supabase target.
- [ ] Health/login/dashboard/inventory/assessment/document/audit application smoke against that recovered application.
- [ ] Full application RTO.
- [ ] Database/customer-data RPO.
- [ ] Storage RPO.

## Advisor snapshot

Security:
- RLS enabled / no policy: 31 INFO
- mutable function search_path: 1 WARN
- authenticated-executable SECURITY DEFINER: 2 WARN

Performance:
- unindexed foreign keys: 104 INFO
- multiple permissive policies: 11 WARN
- duplicate index: 1 WARN
- Auth connection allocation: INFO

Advisor findings are evidence to review, not automatic proof of vulnerability or automatic PASS.

## Safety assertions

- PRODUCTION_CHANGED=NO
- MAIN_CHANGED=NO
- MAASEC_TARGET_CHANGED=NO
- EMAIL_SENT=NO

## Checklist verdict

`POST_REPLAY_DATABASE_SECURITY_CHECK=PASS_WITH_DOCUMENTED_RESIDUALS`

`FULL_POST_RESTORE_APPLICATION_SECURITY_CHECK=OPEN`
