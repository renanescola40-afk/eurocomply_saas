# Legal Rules Runtime Changelog

## 2026-07-30 — automatic post-deployment proof

### Runtime orchestration

- Added automatic capture on successful GitHub `deployment_status` events from the trusted Vercel GitHub App.
- Restricted automatic capture to the repository default branch and the exact current remote default-branch SHA.
- Added approved-host validation for `risckcomply.com`, `www.risckcomply.com` and `*.vercel.app` before the internal secret is sent.
- Kept `workflow_dispatch` as a controlled fallback for explicitly approved preview or production validation.
- Added fail-closed rejection for stale deployments, unknown senders, feature-branch previews, malformed SHAs and unapproved hosts.
- Added contract tests and updated the operating runbook.

### Evidence boundary

- Automatic execution does not make a deployment compliant or production-ready by itself.
- Runtime credit still requires a PASS artifact with exact SHA, URL, test cases, redaction confirmation and recalculated integrity.
- Human legal review and the independent production closeout remain separate gates.

## 2026-07-30 — version 2026-07-30.1

### Legal source refresh

- Replaced the unpublished/pending treatment of the 2026 AI Act amendment with the official Regulation (EU) 2026/1744 source.
- Recorded Official Journal publication on 24 July 2026 and entry into force on 27 July 2026.
- Corrected the new Article 5 points `(ba)` and `(bb)` and paragraphs `1a` and `1b` to apply from 2 December 2026 rather than conflating application with entry into force.
- Restricted the amended Article 111(4) synthetic-content transition to providers and Article 50(2); deployer Article 50(4) duties do not inherit that transition.
- Bound Annex III high-risk application to 2 December 2027 and Annex I/product high-risk application to 2 August 2028 using the official act.

### Runtime evidence

- Added deterministic legal-rules digest and runtime test cases.
- Added protected `/api/ops/legal-rules-validation` with pre-authentication distributed rate limiting, internal cron-token authorization, exact-SHA release metadata, no-store and hardened response headers.
- Added request-ID sanitisation and artifact SHA-256.
- Added fail-closed HTTP 401 for invalid internal authentication and HTTP 503 for unknown SHA, invalid deployment URL or failed legal-rule cases.
- Added an authenticated exact-SHA capture script and pinned GitHub Actions workflow with 365-day artifact retention.
- Removed the unauthenticated public route after endpoint-taxonomy review.

### Coverage and governance

- Updated the EU AI Act product coverage registry so `LEGAL-RULES` requires deployed evidence.
- Extended the coverage scorer to validate the specialized legal-rules artifact, including recalculated integrity.
- Added the versioned article × function × evidence matrix.
- Added separated implementation, test, runtime, human-review, operational and overall-maturity scorecard dimensions.
- Added ADR, validation runbook, rollback plan and consolidated production closeout artifact.

### Truthful closeout state

- The canonical evidence file is committed as `NOT_EXECUTED` and does not count for runtime coverage.
- Qualified legal-rules review evidence is currently absent.
- Deployment smoke remains Open/failed on the base branch.
- The package remains `NO_GO` until required CI and exact-SHA deployment evidence are accepted.
