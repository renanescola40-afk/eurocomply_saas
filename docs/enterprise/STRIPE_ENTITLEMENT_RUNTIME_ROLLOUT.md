# Stripe Entitlement Runtime Rollout Checklist

- [ ] Entitlement reconciliation migration confirmed in target Supabase.
- [ ] Stripe authority source exists for every billed organization.
- [ ] Subscription metadata includes tenant, source, plan, limits and source version.
- [ ] Production webhook endpoint and signing secret are configured.
- [ ] Signed test event reaches the verified route.
- [ ] Duplicate delivery returns idempotent behavior.
- [ ] Upgrade changes canonical seat policy once.
- [ ] Payment failure applies only the approved grace period.
- [ ] Invoice payment clears delinquency through a new snapshot.
- [ ] Cancellation remains effective-dated until the paid period ends.
- [ ] Lower-priority Stripe state cannot override signed-contract authority.
- [ ] Source-version conflicts create actionable operational evidence.
- [ ] Lease recovery is tested without duplicate reconciliation.
- [ ] Event, snapshot and seat-policy identifiers are attached to release evidence.
- [ ] Rollback owner and last-known-good policy versions are recorded.

Green repository CI does not complete items requiring Stripe or Supabase runtime access.
