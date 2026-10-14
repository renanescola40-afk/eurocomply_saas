# RISCK COMPLY — Enterprise Security Evidence V1

**Classification:** Internal working draft. This repository is public; do NOT commit secrets, internal exploit proofs, customer information or confidential buyer materials here.

**Review date:** 2026-10-14  **Baseline commit inspected:** `857ddfb21d0135df3a026ad480da5945119b175c`  **Review mode:** GitHub source inspection only.

**Truth model:** DESIGNED / IMPLEMENTED / STATICALLY_TESTED / RUNTIME_TESTED / EXTERNALLY_VERIFIED / ACCEPTED_BY_BUYER. Never promote a lower evidence class to a higher one.

**Protection rules:** No production mutations, auth/RLS changes, deployment, active testing, live Stripe writes, live pentest, merges, or outbound messages. No live validation commands under this task.

## 01 Security Architecture

Runtime scope: Next.js application, Supabase Auth/Postgres/Storage, Stripe and deployment providers. Source references: `src/lib/supabase/admin.ts`, `src/integrations/supabase/server.ts`. Server-only imports are visible; deployment boundaries and data flows are not runtime validated.

## 02 Control Implementation Matrix

SEC-01 server-only privileged client: IMPLEMENTED (source inspected), not runtime-tested. SEC-02 public environment secret guard: IMPLEMENTED (source inspected), not tested here. SEC-03 API route classification inventory: IMPLEMENTED (source inspected), not executed here. SEC-04 tenant RLS: DESIGNED/UNVERIFIED in this review. SEC-05 step-up MFA: DESIGNED/UNVERIFIED in this review. SEC-06 incident response: DOCUMENTED, not exercised. SEC-07 pentest: OPEN. SEC-08 audit-chain: UNVERIFIED. Each future row must include file, test command, run ID, date, SHA, reviewer.

## 03 Authentication and Authorization Evidence Index

Review protected routes, callbacks, recovery, refresh, token checks, step-up MFA, server actions and owner/admin/member checks. Candidate scripts: `security:auth-tokens`, `security:step-up`, `security:server-action-identity`, `security:protected-routes`. No execution claim.

## 04 RLS and Tenant Isolation Evidence Index

Candidate scripts: `security:rls`, `security:rls:advisory`, `security:rls:live`. WARNING: live scripts are PROHIBITED under this work order; do not run them or the aggregate `security:rls` script because it invokes live validation. Evidence needs migrations, tables, USING/WITH CHECK predicates, SECURITY DEFINER grants and isolated test results.

## 05 API BOLA IDOR Review

`scripts/security/check-authorization-bola.mjs` checks classification inventory completeness; it DOES NOT establish that object-level authorization is correct. Review every route and tenant-bound resource for access checks and cross-tenant denial evidence. Candidate static scripts: `security:authorization-bola`, `security:api-guards`, `security:api-endpoints` after reading script contents.

## 06 Secrets and Supply Chain Review

`src/lib/security/env-guard.ts` implements forbidden NEXT_PUBLIC key and pattern checks. Confirm use sites and test behavior before declaring coverage. Inspect CI workflow, package lock, dependency advisories and key boundaries. Never include raw values, JWTs or unredacted environment snapshots in public evidence.

## 07 Security Testing Results

No commands were executed as part of this initial connector-based source review. All pass/fail cells are NOT_RUN. Capture environment, git SHA, command, exit code, timestamps, output digest and reviewer for future isolated tests.

## 08 Audit Monitoring Logging Review

`docs/INCIDENT_RESPONSE.md` defines SEV1/2/3 and handling stages, while identifying open operational readiness items. Audit-chain and log sanitization scripts exist in package scripts but have not been executed for this review. Alerting, retention, detection and response drills remain unverified.

## 09 Secure SDLC Overview

Candidate checks observed in `package.json`: lint, typecheck, test/build, preflight and multiple security checks. Their mere presence does not prove CI enforcement or successful execution. Require branch protection, CI artefacts, change approval and deployment traceability before PASS.

## 10 Pentest Scope and Handoff Package

Scope candidate: auth/session, tenant isolation, API BOLA/IDOR, upload/storage, Stripe entitlement/webhook and document exports. Third-party tester must agree to staging-only rules, rate limits, test accounts, written authorization, handling of sensitive findings and retest criteria. Production demo is strictly excluded.

## 11 Known Security Risks Register

RISK-001 [Unrated, requires validation]: privileged Supabase client usage could bypass RLS if caller authorization is insufficient; source references `src/lib/supabase/admin.ts` and `src/integrations/supabase/server.ts`; precondition: unauthorized user reaches server path using admin client; impact: potential cross-tenant data exposure; mitigation: inventory call sites and enforce server-side membership checks; evidence: not yet collected. RISK-002 [Unrated, evidence gap]: runtime tenant-denial tests not executed here. RISK-003 [Unrated, evidence gap]: operational alerts/backup restore validation not confirmed. These are review candidates, NOT proven vulnerabilities.

## 12 External Assurance Gap Register

OPEN: independently performed pentest and retest; ISO 27001 certificate; SOC 2 Type I/II report; independent buyer security assessment and acceptance. Do not represent any as completed without dated, authenticated evidence. Distinguish planned, commissioned, issued, accepted.

## 13 Security Executive Summary for Due Diligence

Initial GitHub source inspection located server-only admin client boundaries, a public-secrets environment guard, an API route inventory validator and a documented incident response playbook. This is a preliminary SOURCE-INSPECTION package, not a penetration test, runtime attestation, compliance certification or buyer approval. Production remained untouched by this review.

## Audit progress and gates

- **Controls in initial matrix:** 8.
- **Controls with source evidence in this review:** 3/8 (37.5% source-index coverage only; NOT verified security effectiveness).
- **Runtime test results:** 0 captured; not run.
- **Confirmed findings by severity:** Critical 0, High 0, Medium 0, Low 0; this is *not* evidence of absence of vulnerabilities.
- **Review candidates:** 3 unrated items (see risks register).
- **Internal security audit completion:** Not quantifiable from this limited source sample; remains OPEN.
- **External assurance:** OPEN.
- **Demo protection:** no production operations performed as part of this review.

## Next safe evidence actions

1. Inventory all privileged client call sites and auth guards through static source review.
2. Inspect individual script source before executing any command; exclude live endpoints and network mutations.
3. Review migrations and tenant policy coverage offline.
4. Capture isolated test output with SHA, timestamp and command provenance.
5. Obtain independent assurance and buyer sign-off as separate gates.
