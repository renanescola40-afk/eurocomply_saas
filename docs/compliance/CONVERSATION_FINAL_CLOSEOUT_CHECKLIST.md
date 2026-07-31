# Final closure checklist

- [ ] Exact current `main` SHA frozen and deployed.
- [ ] Repository final closeout accepted.
- [ ] Runtime smoke, readiness and rollback evidence accepted.
- [ ] Supabase reconciliation executed and post-change attestation accepted.
- [ ] Live RLS cross-tenant denial accepted.
- [ ] Backup restore measured against approved RPO/RTO.
- [ ] Stripe checkout, subscription, webhook, entitlement and failure paths accepted.
- [ ] Sentry/logging/tracing/alerts accepted without secrets or prohibited PII.
- [ ] Independent external security review accepted with critical findings closed.
- [ ] Qualified legal reviews and signed founder facts accepted.
- [ ] Release, Security and Operations approvals are independent and current.
- [ ] Final workflow returns `status: CLOSED` and `enterpriseGo: true`.

## Non-negotiable rule

A merged PR, green CI, draft evidence, screenshot, issue comment or owner declaration alone is never sufficient to check an item above.
