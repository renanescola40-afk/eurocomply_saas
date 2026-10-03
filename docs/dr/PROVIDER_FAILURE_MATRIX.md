# Provider Failure Matrix — 2026-10-03

| Scenario | Immediate response | Recovery path | Runtime proof status |
|---|---|---|---|
| Supabase outage | freeze risky writes, verify provider status/logs | recover service or isolated restore; validate schema/RLS/tenant isolation | PARTIAL — provider/project health and schema baseline verified; restore not yet executed |
| Vercel outage/deployment failure | identify known-good READY deployment | rollback to provider-marked rollback candidate after incident approval | FORMALLY REHEARSED NON-DESTRUCTIVELY |
| Stripe outage | preserve server-authoritative entitlement state; do not fabricate payment success | replay/reconcile signed events after provider recovery | DOCUMENTED, NOT EXERCISED HERE |
| Google Auth outage | fail closed for new OAuth sessions; preserve existing secure session rules | provider recovery / documented alternate auth policy if configured | DOCUMENTED, NOT EXERCISED HERE |
| DNS failure | verify registrar/DNS records and domain binding | restore known-good DNS configuration | DOCUMENTED, NOT EXERCISED HERE |
| Database migration failure | stop rollout; do not advance production schema blindly | fix/replay in disposable target first | CURRENT GAP OBSERVED: existing test branches show MIGRATIONS_FAILED |
| Storage failure | preserve metadata and object references | restore/export objects separately from DB backup; verify checksums and policies | DOCUMENTED, NOT RUNTIME-PROVEN |
| Secret rotation incident | revoke/rotate affected secret, rebind only approved environments | validate application and provider integrations after rotation | DOCUMENTED, NOT EXERCISED HERE |

Important: Supabase database backups do not by themselves restore Storage objects; Storage recovery requires a separate object recovery/export strategy.
