# Enterprise Seat Concurrency Rollout Checklist

- [ ] Migration reviewed and applied through the controlled Supabase path.
- [ ] Policy row created for every contracted organization.
- [ ] Policy source references match signed contract or billing records.
- [ ] Missing policy verified to fail closed.
- [ ] Concurrent final-seat reservation test passed in non-production.
- [ ] Idempotent replay verified for invite and SCIM retry paths.
- [ ] Reservation expiry and release jobs verified.
- [ ] Member seat-version conflicts verified.
- [ ] Cross-tenant identifiers verified to fail closed.
- [ ] Service-role RPC grants verified; authenticated execution denied.
- [ ] Event ledger reviewed for successful and rejected attempts.
- [ ] Monitoring added for `seat_limit_reached`, `policy_unavailable` and stale reservation volume.
- [ ] Billing/contract synchronization validated separately.
- [ ] Rollback owner and last-known-good migration identified.

Completion of repository CI does not check any item requiring external infrastructure. Those items must remain open until exact environment evidence is attached.
