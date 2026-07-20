# Auth and tenancy runtime evidence megapack

- Status: Proposed
- Date: 2026-07-20
- Scope: Supabase Auth, RBAC, tenant isolation, enterprise evidence

## Context

The canonical enterprise scorecard already had protected live proof for password login, logout, session refresh, expected owner/member roles and cross-tenant read denial. Signup, mutation isolation and cleanup safety were either not verified or covered only indirectly.

Splitting each proof into a separate pull request would increase review, merge and exact-SHA validation overhead without creating independent product value.

## Decision

Deliver one cohesive runtime-proof package that:

1. creates a disposable password-signup identity through the public Supabase Auth boundary;
2. uses a production-environment service-role secret only to delete that disposable identity;
3. fails closed when cleanup cannot be verified;
4. preserves the existing three-user and two-organization synthetic fixtures;
5. validates same-tenant access and cross-tenant read denial;
6. actively attempts forbidden organization-membership inserts, updates and deletes;
7. actively attempts forbidden organization updates and deletes;
8. requires every runtime assertion to pass for an exact protected main SHA;
9. writes only redacted booleans and provenance;
10. promotes signup and RBAC only when the trusted source and cleanup contract are complete.

## Security boundary

The service-role key is supplied only to the protected GitHub Actions production environment and is never written to evidence, logs, artifacts or browser code. It is used only for deletion of the disposable signup identity. Tenant authorization assertions run with the anonymous client plus real synthetic user sessions, not with the administrative client.

## Evidence boundary

This package proves password signup, cleanup, authentication lifecycle, selected RBAC roles and selected organization/membership RLS denials for synthetic fixtures. It does not prove OAuth callback behavior, organization onboarding completion, MFA, SSO, every tenant-scoped table, customer data correctness, legal compliance or absence of authorization defects.

OAuth callback and full disposable onboarding remain `NOT_VERIFIED` until dedicated real journeys exist.

## Failure behavior

- Missing secrets block the run.
- Failed signup blocks the run.
- Failed disposable-user cleanup blocks the run.
- Any visible or successful cross-tenant mutation blocks the run.
- Stale or non-main SHA provenance blocks canonical promotion.
- Partial evidence never produces a production GO decision.

## Validation

Repository tests verify the expanded runtime check set, cleanup requirement, exact-SHA provenance, canonical promotion rules, redaction declarations and the continued `NOT_VERIFIED` state of OAuth and onboarding.

## Rollback

Revert the workflow, runtime runner, evidence validators, canonical writer, tests and this ADR together. Return signup to `NOT_VERIFIED` and use the previous read-only Auth/RBAC proof contract. No database migration or customer-data rollback is required.
