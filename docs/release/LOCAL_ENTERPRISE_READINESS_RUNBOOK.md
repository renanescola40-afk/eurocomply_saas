# Local Enterprise Readiness Runbook

Current status: **No-Go until runtime evidence is complete**.

This runbook is for Codespaces/local validation only. It does not replace production or production-like evidence.

## Goal

Run the enterprise readiness chain locally without manually exporting every environment variable in the terminal. The local runner now delegates to the same canonical final gate used by CI:

```bash
npm run release:production-final
```

## Required local file

Create `.env.local` in the repository root. Do not commit it.

Required Supabase values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<redacted>
SUPABASE_SERVICE_ROLE_KEY=<redacted>
```

Required step-up proof flag after live MFA/IdP verification:

```env
STEP_UP_RUNTIME_PROVIDER_PROOF=true
```

Optional local step-up settings. The local runner supplies safe defaults when these are absent:

```env
RISCK_COMPLY_ENTERPRISE_RELEASE=true
STEP_UP_PROVIDER_MODE=supabase_mfa
STEP_UP_SIGNING_SECRET=<redacted-long-random-secret>
```

## One command

Run:

```bash
node scripts/release/run-local-enterprise-readiness.mjs
```

The runner:

- loads `.env.local` without printing secret values;
- validates Supabase env presence;
- refuses to proceed unless `STEP_UP_RUNTIME_PROVIDER_PROOF` is explicitly set;
- generates/updates step-up runtime evidence;
- runs `npm run release:production-final` with enterprise release flags;
- writes final validation runner evidence from the canonical production-final evidence files.

## Expected next blockers

After local Supabase and step-up checks pass, the next blockers are likely one or more of:

- enterprise env readiness evidence from the real runner;
- deployment smoke evidence;
- observability smoke evidence;
- rollback dry-run evidence;
- Stripe billing runtime evidence;
- upload scanner runtime evidence;
- audit-chain live evidence;
- branch protection evidence for the final commit;
- external security review or approved exception;
- Auth/RBAC final runtime evidence.

## Security rule

Never paste Supabase service-role keys, Stripe secrets, Sentry secrets, readiness tokens or signing secrets into screenshots, GitHub comments, PR descriptions or chat.

## Final 100% rule

The SaaS is not 100% production/enterprise ready until every release-blocking item in `docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md` is `Complete` for the exact final release commit and `npm run release:production-final` passes against the target runtime.
