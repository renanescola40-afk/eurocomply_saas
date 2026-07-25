# Enterprise Entitlement and Billing Rollout Checklist

- [ ] Migration reviewed and applied through the controlled Supabase path.
- [ ] Contract, Stripe and override source priorities approved.
- [ ] Every enterprise organization has at least one active authority source.
- [ ] Stripe webhook normalization connected to the reconciliation service.
- [ ] Signed-contract import connected to the same reconciliation service.
- [ ] Idempotent replay verified with a real duplicated event.
- [ ] Stale source version verified to fail closed.
- [ ] Lower-priority source verified not to overwrite contract state.
- [ ] Resulting seat policy compared with signed full, participant and viewer limits.
- [ ] Drift and version-conflict alerts configured.
- [ ] Cross-tenant source and snapshot identifiers verified to fail closed.
- [ ] Service-role RPC grants verified and authenticated execution denied.
- [ ] Event ledger reviewed for accepted and rejected reconciliations.
- [ ] Rollback owner and last-known-good policy snapshot recorded.

Repository CI cannot close items that require external systems or human authority approval.
