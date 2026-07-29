# Runtime Closeout Rollout Checklist

- [ ] Merge this PR into `main`.
- [ ] Confirm the current `main` SHA.
- [ ] Produce fresh Stripe runtime evidence for that SHA.
- [ ] Produce fresh enterprise runtime evidence for that SHA.
- [ ] Produce fresh production-final evidence for that SHA.
- [ ] Record a release Go decision for that SHA.
- [ ] Dispatch the protected closeout workflow with all four run IDs.
- [ ] Approve the `production` environment.
- [ ] Verify `SHA256SUMS`.
- [ ] Confirm no blockers and `completionPercentage: 100`.

Rollback consists of disabling the orchestrator. It performs no writes to Stripe, Supabase or product data.
