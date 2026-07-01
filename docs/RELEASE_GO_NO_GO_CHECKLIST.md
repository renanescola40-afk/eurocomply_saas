# Release Go/No-Go Checklist

Final gate for paid public production launch.

This checklist remains compatible with the automated release gate files:

- `docs/RELEASE_APPROVAL_RECORD.md`
- `docs/RELEASE_EVIDENCE_CHECKLIST.md`
- `docs/RELEASE_CANDIDATE_VALIDATION.md`
- `docs/RELEASE_APPROVAL_LINKAGE.md`
- `docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md`

## Current release decision

- Release name: Public Production Final Gate - 2026-07-01
- Latest assessed branch: `release/production-final-readiness`
- Release owner: @renansilva2002 / renanescola40-afk
- Security owner: @renansilva2002 / renanescola40-afk
- Environment: production / staging launch candidate
- Decision: **No-Go** until `npm run release:production-final` passes and writes complete runtime evidence for the promoted commit.

## Required command

```bash
npm run release:production-final
```

The production-final script is recursion-safe. It does not call itself. It executes the concrete launch sequence requested for the paid public release:

1. `npm ci`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run test`
5. `npm run test:e2e`
6. `npm run build`
7. `npm run security:ci`
8. `npm run release:deployment-smoke`
9. `npm run release:rollback:dry-run`
10. `npm run release:readiness`

## Required evidence files

The release command must write these files with `status: Complete` and `outcome: passed`:

- `docs/security/evidence/runtime/deployment-smoke-validation.json`
- `docs/security/evidence/runtime/rollback-dry-run-validation.json`
- `docs/security/evidence/runtime/production-final-validation.json`

## Mandatory Go criteria

Public Production Go is allowed only when all items below pass for the same commit SHA:

- `npm ci`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:e2e`
- `npm run build`
- `npm run security:ci`
- deployment smoke against the configured production or staging URL
- `/api/health` returns HTTP 200 and JSON `status: ok`
- `/api/ready` rejects anonymous requests
- `/api/ready` accepts the configured bearer health token
- `/api/ready` validates Supabase environment and database reachability
- `/api/ready` validates Stripe environment and live price lookup
- `/api/ready` validates Sentry / observability configuration
- landing, pricing, trust, login and signup pages load
- dashboard routes redirect unauthenticated users to login
- private routes return `Cache-Control: no-store`
- sensitive APIs return `Cache-Control: no-store`
- required security headers are present
- rollback target URL exists and passes `/api/health`
- last validated commit SHA is recorded
- build SHA is recorded
- Supabase RLS live validation evidence is attached and marked Complete/passed for public production.
- runtime evidence is redacted and contains no credential material

## Automatic No-Go criteria

Keep **No-Go** if any critical gate fails or if any required evidence file is missing, `Open`, failed, stale, invalid JSON, or tied to a different commit or runtime target.

Never downgrade a critical failure to a warning. Public Production Go requires real passing JSON evidence.

## Evidence mapping

| Area | Required evidence | Current status | Decision |
| --- | --- | --- | --- |
| Final release command | `production-final-validation.json` Complete/passed | Runner aligned to requested `release:production-final` sequence | No-Go until target run passes |
| Deployment smoke | `deployment-smoke-validation.json` Complete/passed | Smoke covers public pages, health, protected readiness, Supabase, Stripe, Sentry, no-store, headers, rollback and metadata | No-Go until target run passes |
| Rollback | `rollback-dry-run-validation.json` Complete/passed | Dry-run gate retained and required | No-Go until target run passes |
| Supabase | `/api/ready` database reachable and Supabase RLS live validation evidence is attached | Runtime check enforced | No-Go until target run passes |
| Stripe | `/api/ready` live price lookup | Runtime check enforced | No-Go until target run passes |
| Sentry / observability | `/api/ready` observability configured | Runtime check enforced | No-Go until target run passes |
| Public pages | landing, pricing, trust, login, signup | Smoke enforced | No-Go until target run passes |
| Private controls | auth redirect and no-store | Smoke enforced | No-Go until target run passes |
| Build metadata | commit SHA and build SHA | Required by smoke and final evidence | No-Go until present |

## Current blockers

| Blocker | Owner | Closure evidence |
| --- | --- | --- |
| Final `npm run release:production-final` not proven passed | @renansilva2002 / renanescola40-afk | Passing `production-final-validation.json` |
| Deployment smoke not proven passed on current promoted target | @renansilva2002 / renanescola40-afk | Passing `deployment-smoke-validation.json` |
| Rollback target not proven passed | @renansilva2002 / renanescola40-afk | Passing `rollback-dry-run-validation.json` |
| Runtime services not proven on target | @renansilva2002 / renanescola40-afk | `/api/ready` Complete/passed for Supabase, Stripe and observability |
| Commit SHA and Build SHA not proven for this release | @renansilva2002 / renanescola40-afk | SHA metadata recorded in smoke and final evidence |

## Decision outcomes

- **Go**: all mandatory criteria pass with complete evidence for the promoted commit.
- **Conditional Go**: allowed only for non-P0 gaps with owner, expiry date and written approval.
- **No-Go**: selected whenever any P0 gate is missing, failing, stale or incomplete.

## Enterprise rule

Enterprise Pilot Go and Enterprise Procurement Go require stronger evidence than public production, including external security review or pentest evidence, real MFA/IdP proof, audit-chain target-live evidence, branch-protection evidence and any enterprise-only runtime gates.

Public Production Go does not claim enterprise procurement readiness or completed external review unless those evidence files are separately Complete/passed.

## Final decision

**No-Go.**

The release system is wired for a paid public launch gate, but the product must not be marked Public Production Go until all P0 checks pass with real JSON evidence generated by `npm run release:production-final`.
