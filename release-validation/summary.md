# Final release validation summary

- Generated at: 2026-06-23T10:20:00+01:00
- Repository: `renanescola40-afk/eurocomply_saas`
- Ref: `release/operational-go-evidence-2026-06-23`
- Commit SHA at bundle creation: `218c415e89dd0f4c0e3ee2085ceae7ba5aa5b3b8`
- Release target: production-and-enterprise
- Overall result: **failed**
- Evidence policy: no command result was marked passed unless observed. Commands not executed are marked `blocked_not_run`.

## Vercel observation

- PR #344 Vercel preview URL observed from the bot comment: `https://eurocomply-saas-git-coverage1-renanescola40-afks-projects.vercel.app`
- PR #344 head commit: `b546847c803ed568371571c1854e13536f5cad27`
- Merge commit observed with Vercel status success: `a0a4849739492133b296962d40036ba1423ab831`
- Build log URL observed from commit status: `https://vercel.com/renanescola40-afks-projects/eurocomply-saas/FVPS9rK98r8ysiXPo8MR1UATF653`
- Runtime URL verification from this environment: **not verified**

## Command results

| Command | Requested | Result | Exit status | Log |
| --- | --- | --- | --- | --- |
| `repository clone / workspace preparation` | no | failed | 128 | `release-validation/logs/00-workspace-preparation.log` |
| `npm ci` | yes | blocked_not_run | n/a | `release-validation/logs/01-npm-ci.log` |
| `npm run lint` | yes | blocked_not_run | n/a | `release-validation/logs/02-lint.log` |
| `npm run typecheck` | yes | blocked_not_run | n/a | `release-validation/logs/03-typecheck.log` |
| `npm run test` | yes | blocked_not_run | n/a | `release-validation/logs/04-test.log` |
| `npm run test:e2e` | yes | blocked_not_run | n/a | `release-validation/logs/05-test-e2e.log` |
| `npm run build` | yes | blocked_not_run | n/a | `release-validation/logs/06-build.log` |
| `npm run security:ci` | yes | blocked_not_run | n/a | `release-validation/logs/07-security-ci.log` |
| `npm run release:readiness` | yes | blocked_not_run | n/a | `release-validation/logs/08-release-readiness.log` |
| `npm run release:enterprise-readiness` | yes | blocked_not_run | n/a | `release-validation/logs/09-release-enterprise-readiness.log` |
| `node scripts/release/run-final-validation.mjs` | yes | blocked_not_run | n/a | `release-validation/logs/10-final-validation-runner.log` |

## Final release decision

**No-Go.** This bundle does not close the final validation gate. It records the remaining gap honestly so the PR cannot accidentally be treated as Go-ready.
