# Release Candidate Validation Runbook

This runbook defines the minimum validation required before EuroComply can be called a public-production Release Candidate or enterprise-ready SaaS.

Automated gate keyword: release candidate.

## Current release posture

EuroComply is in an advanced pre-production state. The product has strong application controls, audit-chain hardening, RLS validation tooling, step-up enforcement scaffolding, upload security, supply-chain guardrails, and security documentation.

It is not a final enterprise release until the checks below are completed and attached as evidence.

Use `docs/RELEASE_EVIDENCE_CHECKLIST.md` as the canonical checklist for attaching release evidence, approvals, exceptions, and manual validation notes.

Use `docs/RELEASE_GO_NO_GO_CHECKLIST.md` as the final decision checklist before marking a release as Go, Conditional Go, or No-Go.

Use `docs/RELEASE_CUSTOMER_COMMUNICATION_PLAN.md` as the required customer communication plan for release-impacting incidents, degraded service, rollback notices, security/privacy statements, and post-incident customer summaries.

## Required evidence before Release Candidate

### 1. Dependency lockfile

A committed `package-lock.json` must exist.

Required commands:

```bash
npm run supply-chain:lockfile
npm run supply-chain:floating-deps
```

The Security CI workflow must use:

```bash
npm ci --ignore-scripts
```

instead of:

```bash
npm install --ignore-scripts
```

### 2. npm audit triage

Generate an audit report:

```bash
npm run security:npm-audit:json > npm-audit.json
npm run security:npm-audit:summary
```

Release evidence must include:

* `npm-audit.json`
* owner decision for every high or critical advisory
* remediation, accepted-risk, or false-positive rationale
* target remediation date for accepted risk

### 3. Security CI green

The following command must pass in CI:

```bash
npm run security:ci
```

It must include at least:

* preflight
* ASVS checks
* headers/clickjacking/CSP checks
* RBAC checks
* upload security checks
* upload content scan checks
* RLS checks
* audit-chain checks
* step-up checks
* supply-chain checks

### 4. Build and deploy validation

The following must pass in the target deployment environment:

```bash
npm run build
```

Release evidence must include:

* Vercel build URL
* final build status
* deployment URL
* build log excerpt for `prebuild`, `security:ci`, and `next build`

### 5. Supabase RLS live validation

`security:rls` must run against the real Supabase project, not only in advisory mode.

Required environment variables:

* `NEXT_PUBLIC_SUPABASE_URL`
* `SUPABASE_SERVICE_ROLE_KEY`
* `SUPABASE_ACCESS_TOKEN`

Required command:

```bash
npm run security:rls
```

Release evidence must include the output and a list of critical tables validated:

* `organizations`
* `organization_members`
* `documents`
* `audit_events`

### 6. Audit-chain live validation

The following must be applied to the target Supabase project:

* `supabase/migrations/20260612_audit_event_hash_chain.sql`
* `supabase/migrations/20260613_audit_event_chained_rpc.sql`
* `supabase/migrations/20260621120000_audit_chain_enterprise_hardening.sql`

Release evidence must include:

* `AUDIT_CHAIN_SIGNING_SECRET` configured for signed audit hashes
* `EVIDENCE_PACK_SIGNING_SECRET` configured for signed audit/evidence exports
* successful migration application
* proof that `append_audit_event_chained(...)` exists
* proof that `createAuditEvent()` uses the transactional RPC path
* a concurrency/retry test or controlled manual validation
* `npm run security:audit-chain` output
* `docs/security/AUDIT_CHAIN_MODEL.md` reviewed
* `docs/security/evidence/runtime/audit-chain-live-validation.json` with status `Complete`
* `scripts/security/verify-audit-chain.mjs` CLI tamper-detection output
* `scripts/security/run-audit-chain-live-validation.mjs` target Supabase output
* proof that audit-chain runtime evidence is complete
* proof that audit-chain RPC is applied and validated

Required target-live command:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
AUDIT_CHAIN_SIGNING_SECRET=...
EVIDENCE_PACK_SIGNING_SECRET=...
AUDIT_CHAIN_LIVE_ORGANIZATION_ID=...
node scripts/security/run-audit-chain-live-validation.mjs
```

After the security reviewer confirms that the generated evidence only contains redacted values and that the synthetic audit rows exist in the target Supabase project, rerun with:

```bash
AUDIT_CHAIN_LIVE_PROOF=true node scripts/security/run-audit-chain-live-validation.mjs
```

The live validation must prove:

* migrations are applied and `audit_events` hash columns are readable
* `append_audit_event_chained` is callable with service-role credentials
* normal append is transactional
* concurrent stale `previous_hash` append is rejected and retry succeeds
* readback verification succeeds with the stored `created_at` values
* tampering changes the expected hash and is detected
* missing `previous_hash` is detected
* verify/export remain protected by RBAC plus step-up and signed evidence export remains fail-closed without signing material

Enterprise release is blocked when audit-chain runtime evidence is missing, incomplete, not linked to release gates, or does not confirm tamper detection, transactional append, concurrency-safe append, signed export, RBAC/step-up protected verification, request-context sanitization, and target-live Supabase validation.

### 7. Step-up security validation

The signed HMAC step-up helper is present, but enterprise release requires a real challenge/verification provider.

Release evidence must include:

* `STEP_UP_SIGNING_SECRET` configured
* real MFA/IdP integration decision
* successful step-up test for protected actions
* proof that sensitive exports, billing, GDPR delete, and audit-chain verification require step-up

### 8. Upload malware/content scanning

Release evidence must include:

* `REQUIRE_MALWARE_SCAN_FOR_UPLOADS=true` for enterprise mode
* `MALWARE_SCANNER_PROVIDER` configured to a real provider
* successful clean-file test
* blocked-file or unavailable-scanner fail-closed test
* audit event evidence containing `scanStatus`, `scanProvider`, `scanRequired`, and `scanCheckedAt`

### 9. Stripe billing validation

Release evidence must include:

* test checkout session creation
* customer portal session creation
* webhook delivery proof
* failed webhook signature test
* step-up validation for billing actions

### 10. Release evidence package

Every Release Candidate must include a completed evidence package based on:

* `docs/RELEASE_EVIDENCE_CHECKLIST.md`
* `docs/RELEASE_APPROVAL_RECORD.md`
* `docs/RELEASE_GO_NO_GO_CHECKLIST.md`
* `docs/RELEASE_CUSTOMER_COMMUNICATION_PLAN.md`

The Go/No-Go checklist must be reviewed before release.

A release may proceed only after Go or explicitly approved Conditional Go.

The evidence package must include:

* release identity
* build and CI proof
* supply-chain proof
* Supabase and RLS proof
* audit-chain proof
* step-up proof
* upload scanning proof
* Stripe billing proof
* observability proof
* customer communication owner and customer notice decision
* status page decision and evidence, when applicable
* external security review proof when applicable
* pentest evidence when applicable
* documented exceptions and approvals
* final Go, Conditional Go, or No-Go decision

### 11. Customer communication readiness

A production or enterprise Release Candidate must define the customer communication path before promotion.

Release evidence must include:

* assigned customer communication owner
* incident commander communication trigger decision
* status page owner or explicit status page exception
* support owner and customer support readiness confirmation
* security/compliance review owner for security, privacy, audit-chain, RLS, authorization, billing, or data integrity messaging
* SEV-1 and SEV-2 communication timing targets
* customer notice evidence for customer-impacting incidents
* post-incident customer summary decision for material incidents

The canonical plan is `docs/RELEASE_CUSTOMER_COMMUNICATION_PLAN.md`.

### 12. Preflight coverage

Release Candidate evidence must prove that preflight protects both operational controls and release governance artifacts.

The preflight file should include at least:

* audit-chain runtime evidence
* `docs/security/AUDIT_CHAIN_MODEL.md`
* `docs/security/evidence/runtime/audit-chain-live-validation.json`
* `scripts/security/verify-audit-chain.mjs`
