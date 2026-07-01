# Enterprise Release GO/NO-GO

Date: 2026-07-01
Branch: `release/go-no-go-real-rc`
Target: B2B European AI governance / AI compliance / EU AI Act readiness SaaS

## Final decision

**CONDITIONAL GO for release-candidate validation only.**

This is **not a final production GO** until the automated gates below have fresh passing evidence from GitHub Actions and production smoke evidence from a real Vercel deployment. The release must be treated as **NO-GO for public production launch** if any critical gate fails or if Vercel deployment is rate-limited/unavailable.

## Release engineering changes in this candidate

- CI workflows now use deterministic `npm ci` installs instead of regenerating `package-lock.json` before validation.
- Security, upload, Stripe, SBOM and Supabase runtime proof workflows no longer refresh the lockfile before the install gate.
- Vercel install command now uses `npm ci --ignore-scripts` instead of `npm install --ignore-scripts`.
- `package.json` now declares the release runtime contract: Node `>=22 <23`, npm `>=10 <11`.
- No secrets were added or exposed.
- No product logic was intentionally changed.

## Mandatory release gate matrix

| Gate | Required command/check | Current status | Evidence | Action required |
| --- | --- | --- | --- | --- |
| Dependency install | `npm ci` | Requires CI evidence | Cannot be proven from repository inspection alone. CI now fails closed because workflows do not refresh lockfile before `npm ci`. | Run CI on this branch/PR and attach logs. |
| Lint | `npm run lint` | Requires CI evidence | CI and production deploy workflows include lint gate. | Must pass before merge/deploy. |
| TypeScript | `npm run typecheck` | Requires CI evidence | CI and production deploy workflows include typecheck gate. | Must pass before merge/deploy. |
| Unit tests | `npm run test` | Requires CI evidence | CI and production deploy workflows include unit test gate. | Must pass before merge/deploy. |
| Build | `npm run build` | Requires CI evidence | Full Security Suite and Vercel production workflow include build gate. | Must pass before deploy. |
| Security CI | `npm run security:ci` | Requires CI evidence | Workflow includes full application security CI gate. | Must pass before deploy. If it fails, do not bypass. |
| Route quality | `npm run quality:routes` | Requires CI evidence | Full Security Suite and production deploy workflow include route quality gate. | Must pass before deploy. |
| Production smoke | `npm run production:smoke` | Requires production evidence | Requires real production/preview URL and runtime envs. | Mark as blocked until envs and URL are configured and smoke artifact is produced. |
| Vercel readiness | `npm run ops:vercel-readiness` | Requires production evidence | Vercel production workflow includes readiness gate. | Must pass with real Vercel project/env configuration. |
| Vercel deploy | `vercel pull`, `vercel build --prod`, `vercel deploy --prebuilt --prod` | Requires Vercel evidence | Production workflow contains these deploy steps. | If Vercel is rate-limited, mark release NO-GO until retry succeeds. |
| Lockfile alignment | `npm run security:package-lock` | Requires CI evidence | Custom gate compares root dependencies/devDependencies in `package.json` and `package-lock.json`. | Must pass before any security gate can pass. |
| Branch protection evidence | `npm run security:branch-protection-evidence` | Requires GitHub evidence | Enterprise readiness expects branch protection evidence. | Verify required checks match actual workflow job names. |
| Supabase live RLS | `npm run security:rls` / live validation workflow | Requires production evidence | Needs real Supabase secrets and live tenant isolation evidence. | Required for enterprise release; not required to claim static RC readiness. |
| Stripe runtime | Stripe runtime proof workflow | Requires runtime evidence | Focused workflow exists and now uses deterministic install. | Run when Stripe env/test secrets are configured. |
| Sentry/observability | Release/env readiness gates | Requires production evidence | Sentry variables are wired into production deploy workflow. | Confirm DSN/project/token presence without exposing values. |
| Rollback | `npm run release:rollback:dry-run` | Requires CI evidence | Included by `release:readiness`. | Must pass before launch. |

## CI/CD notes

- `actions/checkout@v6`, `actions/setup-node@v6`, and `actions/upload-artifact@v7` are intentionally left as-is for this RC. The versions are current/valid enough for the configured workflows, and upgrading them is not necessary for this stabilization pass.
- The old pattern of running `npm install --package-lock-only --ignore-scripts` before `npm ci` was removed from release/security workflows because it can hide package-lock drift.
- The explicit planning workflow `P0 Lockfile Plan` may still generate a lockfile by design because it is an advisory planning workflow, not a release pass/fail gate.

## Vercel release policy

A release is **NO-GO** if any of these are true:

- Vercel deployment is rate-limited.
- `vercel build --prod` fails.
- `vercel deploy --prebuilt --prod` fails.
- Production smoke cannot reach `/api/health`, `/api/ready`, public landing/pricing/trust/login routes, or protected route redirects.
- Required production environment variables are absent.
- Any secret value appears in logs or artifacts.

If Vercel is rate-limited, do not mark the release as passed. Record the blocked deployment URL/status and retry only after the platform limit clears.

## Commands to execute for final proof

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
npm run security:ci
npm run quality:routes
npm run ops:vercel-readiness
npm run release:readiness
npm run production:smoke
```

For enterprise release proof, also execute:

```bash
RELEASE_TARGET=enterprise npm run release:enterprise-readiness
```

## Current objective assessment

- Static release engineering posture: improved.
- Runtime evidence posture: incomplete until CI and production smoke artifacts exist.
- Release readiness score: **7.2 / 10** as a release candidate.
- Production readiness score: **not above 8/10 until fresh CI, Vercel and production smoke evidence pass.**

## Final statement

This branch can be reviewed as a release candidate. It must not be marketed as an enterprise 10/10 production release until all mandatory gates pass with fresh evidence and any production-only checks are explicitly marked complete.
