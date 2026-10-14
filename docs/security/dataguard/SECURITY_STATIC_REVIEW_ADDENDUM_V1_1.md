# Security Evidence Addendum V1.1 — Static Review of Gate Semantics

Date: 2026-10-14. Baseline source inspected: `857ddfb21d0135df3a026ad480da5945119b175c`. Method: read-only GitHub source review; no tests executed; no deployment/runtime access.

## Reviewed source controls

| ID | Source | Verified by inspection | Status and limits |
|---|---|---|---|
| SEC-01 | `src/lib/supabase/admin.ts`, `src/integrations/supabase/server.ts` | Server-only module imports; use of Supabase service role | IMPLEMENTED at source; callers not audited; tenant authorisation not established |
| SEC-02 | `src/lib/security/env-guard.ts` | Forbidden `NEXT_PUBLIC_*` keys and secret-looking values are checked | IMPLEMENTED at source; execution/use sites not established |
| SEC-03 | `scripts/security/check-authorization-bola.mjs` | Validates route inventory classification and stale entries | IMPLEMENTED static inventory control; **not** true BOLA/IDOR proof |
| SEC-04 | `scripts/security/check-rls.mjs` | Defines critical tables and RLS policy checks via Supabase Management API | IMPLEMENTED **checker** at source; not run; migration enforcement and tenant isolation NOT proven |
| SEC-05 | `scripts/security/check-step-up.mjs` | Enumerates step-up helper/provider/routes, token and test expectations | IMPLEMENTED **static checker** at source; MFA enforcement and production AAL2 NOT proven |
| SEC-06 | `docs/INCIDENT_RESPONSE.md` | Incident response process written | DOCUMENTED; drill/alerts/recovery not confirmed |
| SEC-07 | External independent pentest | No report examined | OPEN |
| SEC-08 | Audit-chain runtime proof | No proof examined | UNVERIFIED |

**Source reference coverage:** 5/8 = 62.5%. **Remaining source-reference coverage:** 3/8 = 37.5%. These metrics only mean that source files were inspected, **not** that security controls are effective or the internal review is 62.5% complete.

## Semantic limitations and review candidates (NOT proven vulnerabilities)

1. `check-authorization-bola.mjs` checks inventory taxonomy, rather than enforcing object-level authorisation. Pair it with human/API review of each privileged or tenant-scoped endpoint and negative authorisation tests in isolation.
2. `check-api-guards.mjs` uses string/token presence to identify guards; token presence does not prove execution ordering, trusted identity, or correct permission semantics. On PR events it may check changed API files only, not the complete API surface. It also spawns another local script during full scan; inspect its dependencies before running.
3. `check-rls.mjs` invokes Supabase Management API when a token is present. Do not execute this script under the current zero-demo-interference scope. A completed runtime evidence file may allow Management API failures to be treated as advisory, so a displayed OK must be reconciled against underlying dated proof.
4. `check-step-up.mjs` looks for presence of expected tokens and artifacts; do not represent a passing static checker as proof of an actual MFA challenge, AAL2 or replay rejection at runtime.
5. `check-security-headers.mjs` checks required text inside `next.config.ts` and `proxy.ts`, not the HTTP response headers experienced by a browser. Response-level testing remains OPEN.

## Safe next stage

- Offline review: `src/server/security/step-up.ts`, `src/server/security/step-up-provider.ts`, the referenced migrations, and every privileged Supabase call site.
- Create a source-only route review matrix with evidence at the handler level. Avoid including attack details in this public repository.
- Before local checker runs, inspect execution paths to confirm no network accesses, live credentials, file writes or secrets exposure.
- Any staging runtime test requires an isolated non-production system and clearly scoped credentials; production/demo remain excluded.
- Future evidence records require timestamp, baseline SHA, exact isolated environment, command, result, sanitized artifacts and reviewer.

## Assurance gates

All independent pentest/ISO 27001/SOC 2/buyer acceptance gates remain OPEN. Nothing here asserts no vulnerabilities or production GO. Branch-only documentation; no production mutations.
