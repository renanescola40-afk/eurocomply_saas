# Provider Failure Matrix — 2026-10-03

| Scenario | Immediate response | Recovery path | Runtime proof status |
|---|---|---|---|
| Supabase database/schema loss | freeze risky writes; identify intended recovery point | isolated reconstruction/replay; validate migrations, RLS, FKs and application contract | **SCHEMA REPLAY PROVEN** — dedicated branch reached 113/113 canonical migrations and FUNCTIONS_DEPLOYED |
| Supabase production-data loss | freeze writes; identify provider backup/PITR recovery point | restore backup/PITR into isolated target; validate rows and integrity | **NOT PROVEN HERE** — branch used with_data=false |
| Supabase Storage object loss | preserve DB metadata/object references | restore/export Storage objects separately and validate checksums/policies | **NOT RUNTIME-PROVEN** |
| Vercel deployment failure | identify current and prior READY releases | execute provider rollback, validate production hostname/health, then restore intended version | **LIVE ROLLBACK PROVEN** — production aliases switched to a prior READY deployment and were then restored to the intended current deployment; final /api/health=200 |
| Stripe outage | preserve durable server-authoritative entitlement state; never fabricate payment success | reconcile signed Stripe events after recovery | DOCUMENTED; not exercised by this DR run |
| Google Auth outage | fail closed for new OAuth flows while preserving secure existing-session rules | provider recovery / approved alternate login policy if configured | DOCUMENTED; not exercised here |
| DNS failure | verify registrar/DNS/domain bindings | restore known-good DNS configuration | DOCUMENTED; not exercised here |
| Migration replay failure | stop rollout; diagnose in disposable environment | reconstruct missing historical prerequisites/ACLs and re-run canonical sequence | **EXERCISED AND PROVEN** — real clean-replay failures reproduced and recovered until 113/113 |
| Secret rotation incident | revoke/rotate compromised secret and bind only intended environments | validate integrations after rotation | DOCUMENTED; not exercised here |

## Material exercise finding

A pristine database branch could not initially traverse the current migration history without compatibility reconstruction. The DR exercise reproduced and diagnosed this failure rather than masking it.

Branch-only recovery bridges restored missing historical objects/contracts, after which the environment reached:
- 113/113 canonical migrations
- 107/107 public-table parity
- 107/107 RLS-enable parity
- final branch state `FUNCTIONS_DEPLOYED`

This is runtime evidence for migration-disaster recovery, not proof of customer-data backup/PITR restoration.

## Storage boundary

Database branching/replay and database backup evidence must not be conflated with Supabase Storage object recovery. Storage object restoration remains a separate proof requirement.

## Safety

- Production database mutation: NO
- Vercel production mutation: YES — controlled rollback drill on 2026-10-04; intended deployment restored and health revalidated
- Stripe mutation: NO
- Auth production mutation: NO
- MaaSec target mutation: NO
