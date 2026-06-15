# Phase 3 External Gates Checklist

This checklist tracks confirmations that must happen outside the repository before Phase 3 can be marked production-complete.

## Scope

This file is only for deployment readiness tracking.

It does not authorize product, email, document, or UI template changes.

## External gates

- [ ] Strict Phase 3 checks pass locally or in CI.
- [ ] Progress status check passes locally or in CI.
- [ ] Deployment environment is configured outside the repository.
- [ ] Production environment values are configured in the deployment provider.
- [ ] Database migrations are reviewed and applied in order.
- [ ] Billing live configuration is complete.
- [ ] Billing webhook is configured for production.
- [ ] Observability production project is configured when enabled.
- [ ] Health/readiness checks are protected.
- [ ] Scheduled jobs are protected.
- [ ] Production handoff is accepted by the production owner.

## Closeout rule

Phase 3 is production-complete only when every external gate above is checked and the repository gates pass.

Until then, the correct status is repository-complete or validated, not production-complete.
