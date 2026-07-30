# Legal Rules Runtime Validation Runbook

## Purpose

Capture immutable, exact-SHA runtime evidence that the deployed legal-rules registry and canonical EU AI Act decision engine behave as expected.

This runbook does not replace the full production smoke, qualified legal review or final release approval.

## Preconditions

- CI is green for the exact commit to be deployed.
- The deployment exposes the protected endpoint `/api/ops/legal-rules-validation`.
- `INTERNAL_CRON_SECRET` or `CRON_SECRET` is configured on the deployment.
- The matching `INTERNAL_CRON_SECRET` is available to GitHub Actions.
- Runtime release metadata returns the full 40-character deployed Git SHA.
- The deployment URL is an HTTPS origin without credentials, query parameters or fragments.
- Automatic capture targets only the current default-branch SHA emitted by the trusted Vercel GitHub App.
- The deployment host is `risckcomply.com`, `www.risckcomply.com` or a `*.vercel.app` origin.

## Canonical automatic execution

The **Legal Rules Runtime Validation** workflow listens for GitHub `deployment_status` events. It automatically starts runtime capture only when all of the following are true:

- deployment status is `success`;
- the event sender is exactly `vercel[bot]`;
- the deployment ref equals the repository default branch;
- the deployment SHA is a full lowercase 40-character SHA;
- the deployed SHA still equals the current remote default-branch SHA at execution time;
- the environment URL uses HTTPS and an approved host;
- the checked-out repository SHA equals the deployed SHA;
- the internal cron secret exists.

Events for previews on feature branches, failed deployments, stale main deployments, unknown senders or unapproved hosts are ignored or fail closed before the secret is sent to any endpoint.

## Controlled manual fallback

Use `workflow_dispatch` only when automatic deployment-status delivery is unavailable or an approved preview must be assessed. Provide:

- `deployment_url`: exact deployment origin;
- `expected_sha`: full deployed SHA;
- `environment`: `preview` or `production`.

Manual dispatch still executes the exact-SHA checkout, host boundary, secret presence, endpoint response and artifact-integrity checks. It does not grant permission to validate arbitrary internet hosts.

Equivalent local operator command:

```bash
install -d -m 700 docs/security/evidence/runtime
umask 077
DEPLOYMENT_URL="https://eurocomply-saas.vercel.app" \
EXPECTED_DEPLOYMENT_SHA="<40-character-sha>" \
INTERNAL_CRON_SECRET="<runtime-secret>" \
node scripts/compliance/capture-legal-rules-runtime-evidence.mjs \
  > docs/security/evidence/runtime/legal-rules-validation.json
```

The JavaScript validator never writes the network response directly to the file system. It authenticates to the ops endpoint, validates an exact allow-list of fields, sizes, paths, SHA values, timestamps, redaction declarations and integrity metadata, then emits only the accepted canonical JSON on stdout. The workflow controls the fixed output path with a restrictive umask. The Authorization header is never included in the artifact or logs.

## Automatic-event trust boundary

The deployment event is treated as untrusted until verified. The workflow must not move capture before these checks:

1. trusted Vercel sender;
2. successful status;
3. default-branch ref;
4. exact event SHA;
5. current remote default-branch equality;
6. approved HTTPS host;
7. exact local checkout;
8. secret presence.

Do not broaden the sender or host allow-list merely to make an event run. A new deployment provider or custom domain requires reviewed workflow, tests and documentation in the same change.

## PASS criteria

The capture succeeds only when all of the following are true:

- the deployment event trust boundary passes, or a controlled manual dispatch was used;
- authentication rate limiting succeeds before token validation;
- the internal bearer token is accepted;
- HTTP response is successful;
- `Cache-Control` contains `no-store`;
- no `Set-Cookie` header is returned;
- content type is JSON;
- evidence item is `legal-rules-validation`;
- schema is `risck-comply.legal-rules-runtime-evidence.v1`;
- repository is `renanescola40-afk/eurocomply_saas`;
- deployment SHA exactly matches the expected full SHA;
- deployment URL exactly matches the validated origin;
- environment is explicit and not `unknown`;
- legal rules version is present;
- Regulation (EU) 2026/1744 is present in the exact source-regulation set;
- rules digest and artifact digest are valid SHA-256 values;
- every runtime test case is `PASS`;
- request IDs are sanitized;
- evidence paths are safe repository-relative paths;
- redaction is confirmed;
- the artifact is not a placeholder and does not claim customer-facing proof;
- recalculated artifact SHA-256 matches the document;
- the canonical JSON is within the maximum accepted artifact size.

## Test cases included

- exact deployment SHA available;
- valid deployment URL;
- legal-rules registry structurally valid;
- Article 5 amendment excluded before 2 December 2026;
- Article 5 amendment included on 2 December 2026;
- Article 111(4) transition included for qualifying providers;
- Article 111(4) transition excluded for deployer Article 50(4) duties;
- canonical decision engine excludes/includes the amendment on the correct dates;
- decision output is bound to the current ruleset version.

## Failure handling

### Automatic event ignored

Confirm the event was a successful deployment from `vercel[bot]` for the current default branch. Feature-branch previews and non-Vercel deployment senders are intentionally excluded.

### Current-main mismatch

The deployment became stale before evidence capture. Stop promotion and wait for or initiate an approved deployment of the current default-branch SHA. Never credit the older deployment to the newer SHA.

### Host boundary rejection

- Confirm the event contains the deployable application origin, not a Vercel dashboard URL.
- Confirm the host is an approved `*.vercel.app` origin or official Risck Comply domain.
- Add a new domain only through reviewed code, contract tests and documentation.
- Never send the internal secret to an arbitrary host.

### HTTP 401

- Confirm the deployment and workflow use the same internal cron secret.
- Confirm the secret is present, not whitespace and not accidentally logged.
- Rotate the secret if exposure is suspected.
- Do not bypass authentication or make the endpoint public to obtain evidence.

### HTTP 429

- Confirm the caller is not looping.
- Retry only after the rate-limit window.
- Do not weaken the pre-authentication rate limit for evidence collection.

### HTTP 503

The endpoint failed closed. Inspect the returned test cases without logging secrets. Common causes:

- deployment SHA environment variable is absent or malformed;
- legal-rules validation failed;
- the deployed code does not match the expected branch;
- the deployment URL is not the actual origin.

Do not change expected values merely to obtain PASS.

### SHA mismatch

- Stop promotion.
- Confirm the Vercel/GitHub deployment commit.
- Redeploy the intended SHA or assess the actual deployed SHA.
- Never relabel an artifact from another SHA.

### Integrity mismatch

- Discard the artifact.
- Re-run the endpoint and capture script.
- Investigate any intermediary, manual edit or serialization change.

### Field or size rejection

- Treat unexpected fields, unsafe paths or oversized output as a security failure.
- Do not broaden the allow-list merely to accept an unexplained response.
- Confirm the endpoint and capture schema changed together under review.

### Vercel deployment quota or provider limit

Record `BLOCKED — external provider quota/rate limit`. Continue repository-side CI and PR review, but do not claim runtime verification or production readiness.

## Promotion procedure

1. Download the workflow artifact for the exact SHA.
2. Verify its workflow event, sender, run, repository, SHA and retention metadata.
3. Verify the artifact was produced by the current-main automatic path or an explicitly approved manual dispatch.
4. Replace the canonical `NOT_EXECUTED` placeholder only with the verified PASS document.
5. Regenerate EU AI Act product coverage with the exact SHA and artifact root.
6. Regenerate the technical scorecard.
7. Preserve the original workflow artifact; do not rely only on a repository copy.
8. Proceed to full deployment smoke, protected readiness, production providers, backup/restore and final closeout.

## Rollback

Follow `docs/compliance/LEGAL_RULES_RUNTIME_ROLLBACK_PLAN.md`. Runtime evidence is append-only: a rollback creates new evidence for the rollback SHA and never mutates proof for a prior SHA.

Disable the `deployment_status` trigger first if an event-routing incident is suspected. The protected endpoint and manual capture remain fail-closed while the automation is investigated.

## Escalation

Escalate to qualified legal review when:

- official text and product rule disagree;
- application date, legal role, exception or transition is ambiguous;
- a source is corrected or superseded;
- a customer-specific classification is contested.
