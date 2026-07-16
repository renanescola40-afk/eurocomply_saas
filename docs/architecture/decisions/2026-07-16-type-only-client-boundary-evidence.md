# Type-only imports and client runtime boundary evidence

- Date: 2026-07-16
- Status: Accepted
- Scope: client-boundary security gate and enterprise repository evidence

## Context

The strict client-boundary scanner classified every import from a server namespace as a runtime boundary violation. That included TypeScript `import type` declarations. Type-only imports are removed from emitted JavaScript and do not execute the referenced server module, bundle service-role code, or expose provider credentials.

The false positive prevented the exact-SHA Supabase administrative-client boundary evidence from completing even though the affected client components only consumed compile-time data shapes. A separate scorecard source contract also expected the phrase `partial` in the truthful internal batch test, while the test verified the behavior without naming the partial-failure envelope explicitly.

## Decision

The client-boundary scanner now distinguishes imports as follows:

1. `import type` declarations are treated as compile-time-only and are not runtime boundary findings.
2. Normal static imports, side-effect imports, and dynamic imports from server-only modules remain prohibited.
3. Non-public environment access and browser token-storage findings remain unchanged and fail closed in strict mode.
4. Regression tests execute the scanner against isolated synthetic client files and prove both the accepted type-only case and rejected runtime/dynamic cases.
5. The internal batch test names its verified behavior as a partial-failure multi-status envelope so the evidence source contract reflects the actual assertion.

## Consequences

- The scanner represents the emitted client runtime more accurately without weakening service-role, secret, environment, token-storage, or dynamic-import protections.
- Existing type-only contracts may remain close to their server implementations while runtime dependencies stay server-only.
- The enterprise evidence generator can close the administrative-client boundary and truthful partial-failure controls only when the strict executable checks and exact-SHA aggregate checks pass.

## Evidence boundary

This change proves repository and build-time runtime-boundary behavior. It does not prove production Supabase configuration, secret rotation, RLS enforcement, or live cross-tenant isolation.

## Rollback

Revert the related pull request. The strict scanner will again classify type-only imports as runtime findings and the affected scorecard controls will return to `NOT_VERIFIED`.
