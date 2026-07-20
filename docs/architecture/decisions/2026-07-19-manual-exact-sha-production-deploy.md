# Require manual exact-SHA production deployment

- Date: 2026-07-19
- Status: Proposed
- Priority: P0

## Context

The Vercel production workflow accepted both manual dispatch and every push to `main`. A successful merge could therefore start a production deployment without a separate release decision. The workflow also loaded retired Clerk configuration even though Supabase Auth is the repository's sole identity authority, and it resolved GitHub Actions and the Vercel CLI through mutable version references.

## Decision

Production deployment is manual only. The operator must dispatch the workflow from `main`, provide a full SHA that exactly equals the current remote `main` tip, and type `DEPLOY_PRODUCTION`. The workflow verifies that relationship before protected-environment approval, after checking out the release SHA, and once more after the provider build immediately before the production deploy command.

The production job retains the existing `production` GitHub environment so configured reviewers and secrets remain authoritative. GitHub Actions use immutable commit SHAs and the Vercel CLI uses one explicit version. Clerk variables and the obsolete Clerk organization migration workflow are removed; historical database migrations remain immutable.

All repository, security, route, provider-readiness and release gates continue to run before the first provider mutation. The workflow does not bypass required review, branch protection, runtime evidence or enterprise scorecard criteria.

## Consequences

- A merge no longer deploys production automatically.
- A stale, ancestor, feature-branch or malformed SHA fails closed.
- An incorrect confirmation fails closed.
- A newly advanced `main` invalidates an in-flight stale release before provider mutation.
- Production still depends on a human environment approval and valid provider configuration.
- The pinned Vercel CLI must be intentionally upgraded and revalidated.

## Evidence boundary

Repository tests prove workflow structure only. This decision does not claim that GitHub environment reviewers are configured, that provider secrets are correct, that a deployment occurred, or that production is healthy.

## Rollback

Revert the workflow and contract changes before deployment. Re-enabling automatic production deployment or a second identity authority requires a new security and release decision; it is not an acceptable operational rollback.
