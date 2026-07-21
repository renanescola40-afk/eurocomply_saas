# Safe Runtime Bootstrap Acceptance

- [x] full and safe campaign profiles are explicit and versioned
- [x] safe profile excludes recovery and external assurance
- [x] safe profile does not require rollback confirmation
- [x] exact-SHA push and dispatch runs can be reused
- [x] completed failed runs are re-dispatched rather than trusted
- [x] artifact downloads retain the existing bounded extraction controls
- [x] safe promotion stages only safe-lane evidence
- [x] REL-10 generation is disabled for safe promotion
- [x] safe closeout remains truthful when release decision is NO_GO
- [x] automatic execution waits for successful Full Security Suite on main
- [x] manual execution requires an explicit confirmation
- [x] positive and negative profile/promotion tests exist
- [ ] merge the PR
- [ ] allow the automatic workflow to run on integrated main
- [ ] inspect and correct any blocked runtime lane
- [ ] retain the accepted safe promotion artifact
- [ ] execute recovery and assurance separately
- [ ] run the full closeout to reach 100% / GO
