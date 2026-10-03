# Post-Restore Security Checklist

Run only against the dedicated recovered non-production target.

- [ ] Expected public table count matches recovery baseline.
- [ ] RLS enabled on every expected exposed public table.
- [ ] No unexpected permissive policies.
- [ ] Tenant A cannot read/write Tenant B records using synthetic test tenants.
- [ ] Required foreign keys are valid.
- [ ] Required indexes are present.
- [ ] Required functions are present with expected security mode/search path.
- [ ] Required triggers are present.
- [ ] Migration history matches the intended recovery point.
- [ ] Auth-related structures are present without copying real customer credentials into test workflows.
- [ ] Storage metadata is consistent with the separately recovered/exported object set.
- [ ] Billing ledger structures exist; no real Stripe webhooks target the recovery environment.
- [ ] Real outbound email is disabled.
- [ ] Application uses only recovery-environment secrets and endpoints.
- [ ] Health/dashboard/inventory/assessment/document/audit smoke tests pass.
- [ ] Supabase security advisors reviewed and deviations explained.

PASS requires evidence for every applicable item; unchecked items remain NOT PROVEN.
