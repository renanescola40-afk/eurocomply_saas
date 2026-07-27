# Stripe Runtime Proof Rollout Checklist

- [ ] #1357 or equivalent Stripe entitlement runtime is present on `main`.
- [ ] Entitlement reconciliation and seat-policy migrations are applied to the target Supabase project.
- [ ] Stripe webhook endpoint uses the expected signing secret.
- [ ] Test-mode product, price and subscription metadata are populated.
- [ ] Metadata organization and entitlement source belong to the same tenant.
- [ ] Expected source version is current.
- [ ] Upgrade event has been delivered and processed.
- [ ] Runtime proof passes for upgrade.
- [ ] Runtime proof passes for payment failure with bounded grace.
- [ ] Runtime proof passes for payment recovery.
- [ ] Runtime proof passes for effective-dated cancellation.
- [ ] Duplicate event replay leaves capacity unchanged.
- [ ] Lower-priority Stripe state cannot override stronger contract authority.
- [ ] Sanitized artifact is reviewed and attached to the release evidence register.
- [ ] Rollback owner and last-known-good seat policy are recorded.

Repository CI does not complete items that require Stripe, Supabase or human review.
