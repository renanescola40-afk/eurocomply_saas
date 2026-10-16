# Agent commit attribution and Vercel deployment policy

Scope: AI coding agents, CI automation, and GitHub/Vercel deployment operators.

## Verified observation (2026-10-16)
GitHub merge commits for main have been attributed to `sastestezoer-commits`, while the Vercel team lists `renanescola40-afk` as its authorized owner. Git-triggered Production deployments for affected SHAs were BLOCKED with Vercel collaboration documentation links. Owner-authenticated deployments of the same Git SHAs succeeded as staging builds. This supports a commit-identity/authorization problem but does not establish that all build and release gates pass.

## Instructions for all agents
1. Before committing or opening a PR, report the **actual** authenticated GitHub principal, local `git config user.name` and `git config user.email` (redact email in public logs), and whether the intended provider recognizes that principal. A Git commit's author is not necessarily the authenticated actor.
2. Never impersonate the owner by changing git author/committer metadata to an account the agent does not control. Never rewrite historical commit attribution merely to satisfy Vercel checks.
3. For locally generated commits, configure `user.name` and `user.email` for the **real authorized agent identity**; use its verified email/noreply address. Do not hardcode an owner's email or token in files, prompts, logs or source control.
4. When the acting GitHub account is `sastestezoer-commits` (or any identity not authorized by Vercel), do not assume Git-triggered Production deploy will succeed. Report `VERCEL_GIT_AUTHOR_AUTHORIZATION=BLOCKED` and request an owner-managed account connection or an authorized protected CI deployment job.
5. When a bot identity legitimately needs collaborator membership, the owner must assess account access and incremental pricing before invitation. No automatic invite or plan change.
6. Prefer the existing protected `.github/workflows/vercel-production.yml` for approved releases. Preserve its exact-main-SHA checks, environment approval and CI/security gates. Do not silently convert its manual authorization to auto-deployment, disable required checks, or expose deployment secrets.
7. Any alternative Vercel API/GitHub Actions pipeline must use a protected scoped Vercel credential, saved only as a GitHub environment secret, with an approved principal and exact-SHA verification. Never fabricate deployment authority from author metadata alone.
8. Preview/staging READY is not Production GO. Confirm Production SHA, immutable deployment health and readiness, rollback candidate, and runtime smoke evidence.
9. Keep production, customer data, DataGuard demo, and email communications untouched unless explicitly authorized for the specific operation.

## Owner-side connection checklist
- Verify `renanescola40-afk` is linked to GitHub under Vercel account authentication and is authorized on the intended Vercel team.
- Identify which agent integration is authenticated as `sastestezoer-commits`. Configure that integration to authenticate legitimately as an authorized principal, or have it deliver PRs for human merge and a protected deploy.
- Validate a fresh, harmless test commit's actual author and Vercel state before concluding automatic production deployment works.
- If choosing GitHub Actions release automation, assess protected environment secrets and approvals. Store tokens via the provider settings UI; never send them in chat.
