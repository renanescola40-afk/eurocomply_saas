# Identity access lifecycle acceptance

## Repository implementation

- [x] Protected manual workflow
- [x] Exact-main SHA verification
- [x] Disposable randomized account
- [x] Signup and password login proof
- [x] Refresh token proof
- [x] Recovery request proof
- [x] Logout and revoked-session denial proof
- [x] OAuth callback fail-closed proof
- [x] OIDC discovery validation
- [x] Administrator MFA attestation gate
- [x] Sensitive-action step-up attestation gate
- [x] Organization onboarding attestation gate
- [x] Mandatory service-role cleanup
- [x] Redacted canonical evidence
- [x] Strict fail-closed validator
- [x] Contract tests, ADR and runbook

## Runtime acceptance

- [ ] Exact-head CI and security checks are green
- [ ] Independent review is complete
- [ ] Protected environment variables were independently reviewed
- [ ] Runtime proof executed on merged exact `main` SHA
- [ ] Evidence artifact is `Complete/passed`
- [ ] Strict evidence validator passed
- [ ] Scorecard promotion was generated from accepted evidence

Unchecked runtime items remain blockers. Repository implementation alone does not change the official enterprise percentage.
