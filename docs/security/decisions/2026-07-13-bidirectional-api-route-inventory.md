# Bidirectional API route inventory validation

Date: 2026-07-13
Status: Implemented in review branch
Scope: Repository security control; no runtime or database change

## Finding

The API route inventory check only verified that discovered `src/app/api/**/route.ts` files had a classification. It did not reject classifications for routes that no longer existed, did not scan the legacy `src/app/next_api` namespace, and contained explicit fallback classifications that could mask missing inventory entries.

A stale Clerk organization-sync route remained in `docs/security/API_ROUTE_INVENTORY.md` after the project returned to a Supabase-only authentication stack.

## Risk

A one-way inventory check can produce misleading security documentation and procurement evidence. Explicit fallbacks also weaken the control because selected routes can remain classified in code even when the canonical inventory is incomplete.

This finding does not prove a production exploit. It is a control-integrity and auditability defect.

## Decision

The inventory validator now:

- scans both `src/app/api` and `src/app/next_api`;
- fails when a discovered route is missing from the canonical inventory;
- fails when the inventory references a route that does not exist;
- fails when the same route is classified more than once;
- validates every recorded route class against the allowed taxonomy;
- contains no explicit route-class fallbacks.

The obsolete Clerk route entry was removed from the inventory.

## Validation

Repository-level validation expected on the pull request:

- `npm run security:authorization-bola`
- `npm run test -- src/server/security/api-guard.security.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run security:ci`

No runtime evidence is claimed by this document. GitHub Actions results on the pull request are the authoritative validation record.

## Rollback

Revert the pull request. No migrations, environment variables, secrets, external services, or persisted application data are affected.
