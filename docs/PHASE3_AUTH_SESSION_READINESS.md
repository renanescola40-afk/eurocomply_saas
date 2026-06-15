# Phase 3 Auth and Session Readiness Guide

This guide defines the authentication, session, and authorization contract for EuroComply SaaS production readiness.

## Scope

This document covers production readiness expectations for authentication, session handling, protected routes, tenant isolation, and privileged server operations.

It does not authorize template, UI, product copy, document template, or email template changes.

## Required auth readiness checks

Before production release:

1. Anonymous users must not access protected dashboard, billing, evidence, audit, admin, or account routes.
2. Authenticated users must only access their own tenant/workspace data.
3. Server-side route handlers must re-check identity and authorization before performing writes.
4. Client components must not receive service-role credentials, private keys, webhook secrets, healthcheck tokens, or cron secrets.
5. Session expiry and refresh behavior must be tested in production-like mode.
6. Logout must invalidate the user-facing session state.
7. Billing/webhook routes must not trust client-supplied account or tenant identifiers.

## Required protected route posture

Protected routes must fail closed. When identity cannot be verified, return a redirect, `401`, or `403` according to the route type.

Do not return partial private data before authorization is complete.

## Tenant isolation posture

Tenant isolation must be enforced in both application code and database policy.

Required posture:

- Read operations filter by the authenticated tenant/workspace.
- Write operations bind records to the authenticated tenant/workspace.
- RLS remains enabled for tenant-owned tables.
- Service-role operations are limited to server-only operational flows.
- Audit/evidence exports cannot include another tenant's data.

## Privileged method controls

Privileged methods include:

- Supabase service-role operations.
- Stripe billing and webhook operations.
- Cron or scheduled maintenance operations.
- Evidence pack signing.
- Admin-only audit operations.

Privileged methods must require server-side authorization and must not be callable from unauthenticated public clients.

## Prohibited auth patterns

Do not ship production code that:

- Uses client-provided tenant IDs as the only authorization check.
- Sends service-role credentials to the browser.
- Allows webhook mutation without signature verification.
- Allows cron mutation without `CRON_SECRET` or equivalent internal authorization.
- Logs session cookies, refresh tokens, service-role keys, or customer documents.
- Falls back to allow access when auth provider checks fail.

## Phase 3 completion note

Phase 3 auth/session readiness is complete only when these controls are documented, validation scripts reference them, and the strict runner passes without requiring template changes.
