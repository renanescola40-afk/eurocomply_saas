# Stripe Runtime Evidence Promotion Rollout

- [ ] PR checks pass on the exact head SHA.
- [ ] Promotion workflow reviewed for read-only permissions.
- [ ] Protected `production` environment requires approval.
- [ ] Runtime proof artifact name is bound to the release SHA.
- [ ] Test-mode event metadata contains valid organization, source, plan and seat limits.
- [ ] First signed delivery produces processed event, snapshot, policy and reconciliation evidence.
- [ ] Second delivery of the same event is classified duplicate.
- [ ] Snapshot count remains stable after replay.
- [ ] Policy version and seat limits remain stable after replay.
- [ ] Reconciliation count remains stable after replay.
- [ ] Raw correlated database output is deleted before upload.
- [ ] Sanitized proof contains no full identifiers or secrets.
- [ ] Promotion artifact reports `Complete / passed` for the exact current main SHA.
- [ ] SHA256SUMS verified by the release reviewer.
- [ ] Evidence limitations recorded in the release decision.

Repository CI validates only the promotion contract. Items requiring Stripe, Supabase, protected environments or a reviewer remain incomplete until observed externally.
