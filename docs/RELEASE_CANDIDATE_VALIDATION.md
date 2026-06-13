# Release Candidate Validation Runbook

This runbook defines the minimum validation required before EuroComply can be called a public-production Release Candidate or enterprise-ready SaaS.

## Current release posture

EuroComply is in an advanced pre-production state. The product has strong application controls, audit-chain hardening, RLS validation tooling, step-up enforcement scaffolding, upload security, supply-chain guardrails, and security documentation.

It is not a final enterprise release until the checks below are completed and attached as evidence.

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

- `npm-audit.json`
- owner decision for every high or critical advisory
- remediation, accepted-risk, or false-positive rationale
- target remediation date for accepted risk

### 3. Security CI green

The following command must pass in CI:

```bash
npm run security:ci
```

It must include at least:

- preflight
- ASVS checks
- headers/clickjacking/CSP checks
- RBAC checks
- upload security checks
- upload content scan checks
- RLS checks
- audit-chain checks
- step-up checks
- supply-chain checks

### 4. Build and deploy validation

The following must pass in the target deployment environment:

```bash
npm run build
```

Release evidence must include:

- Vercel build URL
- final build status
- deployment URL
- build log excerpt for `prebuild`, `security:ci`, and `next build`

### 5. Supabase RLS live validation

`security:rls` must run against the real Supabase project, not only in advisory mode.

Required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ACCESS_TOKEN`

Required command:

```bash
npm run security:rls
```

Release evidence must include the output and a list of critical tables validated:

- `organizations`
- `organization_members`
- `documents`
- `audit_events`

### 6. Audit-chain live validation

The following must be applied to the target Supabase project:

- `supabase/migrations/20260612_audit_event_hash_chain.sql`
- `supabase/migrations/20260613_audit_event_chained_rpc.sql`

Release evidence must include:

- successful migration application
- proof that `append_audit_event_chained(...)` exists
- proof that `createAuditEvent()` uses the transactional RPC path
- a concurrency/retry test or controlled manual validation

### 7. Step-up security validation

The signed HMAC step-up helper is present, but enterprise release requires a real challenge/verification provider.

Release evidence must include:

- `STEP_UP_SIGNING_SECRET` configured
- real MFA/IdP integration decision
- successful step-up test for protected actions
- proof that sensitive exports, billing, GDPR delete, and audit-chain verification require step-up

### 8. Upload malware/content scanning

Release evidence must include:

- `REQUIRE_MALWARE_SCAN_FOR_UPLOADS=true` for enterprise mode
- `MALWARE_SCANNER_PROVIDER` configured to a real provider
- successful clean-file test
- blocked-file or unavailable-scanner fail-closed test
- audit event evidence containing `scanStatus`, `scanProvider`, `scanRequired`, and `scanCheckedAt`

### 9. Stripe billing validation

Release evidence must include:

- test checkout session creation
- customer portal session creation
- webhook delivery proof
- failed webhook signature test
- step-up validation for billing actions

### 10. External review

Before public enterprise procurement, attach evidence for:

- dependency audit triage
- basic penetration test or external security review
- privacy/data-retention review
- incident response owner and escalation path

## Release decision

EuroComply may be called a Release Candidate only when all required evidence sections above are complete.

EuroComply may be called enterprise-ready only when:

- Security CI is green
- lockfile is committed
- npm audit is triaged
- Supabase RLS live validation is complete
- audit-chain RPC is applied and validated
- step-up uses a real MFA/IdP provider
- upload scanning uses a real provider in fail-closed mode
- Stripe webhooks are validated
- external security review is complete

## Failure handling

If any Release Candidate validation fails:

1. block release
2. create an issue with owner and deadline
3. attach failing evidence
4. rerun the full validation after remediation
