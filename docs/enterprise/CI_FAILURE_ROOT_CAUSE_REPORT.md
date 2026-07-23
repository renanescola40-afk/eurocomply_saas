# CI Failure Root-Cause Report

## PR #1313

The first blocking failure was the Authorization/BOLA gate's bidirectional route inventory check. The new file `src/app/api/ai-governance/qms/route.ts` was not classified in `docs/security/API_ROUTE_INVENTORY.md`. Lint, typecheck, tests, build, secret scanning, RLS and the preceding security controls were not the root cause.

The same root failure then surfaced through CI, Full Security Suite, Enterprise Production Gate and Enterprise Readiness Scorecard. Those red checks were consequences, not independent defects.

Resolution in this branch: register the QMS route as high-risk with authentication, active organization, RBAC, server-resolved tenant scope, trusted origin, bounded Zod payloads, distributed rate limiting, no-store, optimistic concurrency and durable audit requirements.

## PR #1314

The application security workflow passed. Remaining red checks primarily represented dependency-review configuration and strict enterprise evidence closure despite the PR's stated purpose of creating the qualified-review process. Missing real qualified reviewers is a valid enterprise NO-GO condition, but not a code merge defect.

Resolution in this branch: evidence closure report mode remains visible on relevant PRs and publishes artifacts/notices; strict closure is limited to protected manual promotion.

## PR #1315

The PR intentionally promotes safe isolated runtime evidence while keeping final enterprise coverage below complete and the decision at NO-GO. Treating that expected NO-GO as a normal merge failure creates a circular dependency: the evidence implementation cannot merge because the evidence it creates is not yet present.

Resolution in this branch: production validation runs on `main` or manual release dispatch, not ordinary PRs. Strict enterprise closure remains fail-closed for protected promotion.

## Decision

`PR Merge Gate` is the canonical blocking code gate. Release and enterprise maturity workflows retain independent reporting and strict promotion controls without duplicating the same build/security commands across every pull request.
