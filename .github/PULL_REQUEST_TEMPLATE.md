## Summary

Describe what changed and why.

## Type of change

- [ ] Feature
- [ ] Bug fix
- [ ] Security hardening
- [ ] Billing/entitlements
- [ ] i18n
- [ ] Documentation
- [ ] Refactor

## Production readiness checklist

- [ ] `npm run preflight` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run test` passes
- [ ] `npm run build` passes
- [ ] No secrets or tokens committed
- [ ] New APIs enforce authentication where required
- [ ] Organization-scoped data is filtered by `organization_id`
- [ ] Premium functionality checks entitlements server-side
- [ ] Sensitive responses use `Cache-Control: no-store`
- [ ] User-facing text is localizable or intentionally language-specific
- [ ] Database changes include an idempotent Supabase migration
- [ ] Stripe changes include webhook/portal impact notes

## Screenshots or evidence

Add screenshots, logs, or test output when relevant.

## Rollback plan

Explain how to safely revert this change if needed.
