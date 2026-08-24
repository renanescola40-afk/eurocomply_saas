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
- Automatic Production capture uses the canonical HTTPS origin `https://www.risckcomply.com` without credentials, query parameters or fragments.
- Manual fallback may use an explicitly supplied approved HTTPS origin without credentials, query parameters or fragments.
- Automatic capture targets only the current default-branch SHA emitted by the trusted Vercel GitHub App.
- Manual fallback hosts are limited to `risckcomply.com`, `www.risckcomply.com` or an approved `*.vercel.app` origin.

## Canonical automatic execution

The **Legal Rules Runtime Validation** workflow listens for GitHub `deployment_status` events. It automatically starts runtime capture only when all of the following are true:

- deployment status is `success`;
- the event sender is exactly `vercel[bot]`;
- the deployment ref equals the repository default branch, or is empty when GitHub represents a deployment created from an exact commit SHA without a Git ref;
- the deployment SHA is a full lowercase 40-character SHA;
- the deployed SHA still equals the current remote default-branch SHA at execution time;
- the capture target is the canonical Production origin `https://www.risckcomply.com`;
- the checked-out repository SHA equals the deployed SHA;
- the internal cron secret exists.

The Vercel deployment event supplies deployment authority and the expected SHA; its deployment-specific `environment_url` is not used as the automatic capture target. This avoids confusing deployment-protection responses on `*.vercel.app` URLs with application responses. Exact release binding is preserved because the protected endpoint must return the same full deployment SHA emitted by the trusted Vercel event, and the workflow separately requires that SHA to still equal current `main`.

An empty deployment ref does **not** relax current-main binding. Before the secret is sent to the application, the workflow fetches the remote default branch and requires its SHA to equal the deployment SHA exactly. If the canonical Production alias has not yet converged to that SHA, capture fails closed on the runtime deployment-SHA mismatch. Events for previews on feature branches, failed deployments, stale main deployments or unknown senders are ignored or fail closed before the secret is sent to any endpoint.

## Controlled manual fallback

Use `workflow_dispatch` only when automatic deployment-status delivery is unavailable or an approved preview must be assessed. Provide:

- `deployment_url`: exact approved HTTPS deployment origin;
- `expected_sha`: full deployed SHA;
- `environment`: `preview` or `production`.

Manual dispatch still executes the exact-SHA checkout, host boundary, secret presence, endpoint response and artifact-integrity checks. It does not grant permission to validate arbitrary internet hosts.

Equivalent local operator command:

```bash
install -d -m 700 docs/security/evidence/runtime
umask 077
DEPLOYMENT_URL="https://www.risckcomply.com" \
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
3. default-branch ref or an empty ref for a commit-SHA deployment;
4. exact event SHA;
5. current remote default-branch equality;
6. canonical automatic Production origin `https://www.risckcomply.com`;
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

Confirm the event was a successful deployment from `vercel[bot]` for the current default-branch SHA. The deployment ref may be the default branch or empty for an exact commit-SHA deployment; in the empty-ref case, the separate remote-main SHA equality check remains mandatory. Feature-branch previews and non-Vercel deployment senders are intentionally excluded.

### Current-main mismatch

The deployment became stale before evidence capture. Stop promotion and wait for or initiate an approved deployment of the current default-branch SHA. Never credit the older deployment to the newer SHA.

### Canonical Production alias not converged

Automatic capture deliberately calls `https://www.risckcomply.com`, not the Vercel deployment-specific `environment_url`. If the alias still serves an older release, the endpoint's runtime release metadata will not match the trusted deployment event SHA and capture fails closed.

- Confirm the Vercel Production deployment for the event SHA is `READY`.
- Confirm `www.risckcomply.com` is assigned to that Production deployment.
- Re-run only after the canonical alias serves the expected SHA.
- Never weaken the deployment-SHA equality check or relabel evidence from the prior alias target.

### Host boundary rejection

For automatic runs, the target must be exactly `https://www.risckcomply.com`. For manual fallback, confirm the supplied host is an approved `*.vercel.app` origin or official Risck Comply domain.

- Add a new domain only through reviewed code, contract tests and documentation.
- Never send the internal secret to an arbitrary host.

### Deployment-specific URL returns cookies before the app

A Vercel deployment-specific URL can be intercepted by Deployment Protection before the request reaches `/api/ops/legal-rules-validation`. A protection-layer response may set cookies, and the runtime validator correctly rejects any `Set-Cookie` response.

- Do not disable the cookie rejection.
- Do not treat a protected-edge response as application evidence.
- For automatic Production capture, use the canonical Production origin and retain exact event-SHA/runtime-SHA equality.
- For a manual preview proof, resolve the approved access path rather than bypassing evidence controls.

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
- the validated origin is not serving the expected release.

Do not change expected values merely to obtain PASS.

### SHA mismatch

- Stop promotion.
- Confirm the Vercel/GitHub deployment commit.
- Confirm the canonical Production alias serves the intended SHA.
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

## Exact-SHA closeout consumption

The **EU AI Act Final Runtime Closeout** may consume the immutable Legal Rules runtime artifact directly as an evidence overlay. It must locate only the artifact named `legal-rules-runtime-<TARGET_SHA>`, require the source workflow to be **Legal Rules Runtime Validation**, require source conclusion `success`, require source `head_sha` and `head_branch` to match the exact current main, and accept only the controlled `deployment_status` or `workflow_dispatch` source events. The downloaded document is then revalidated with the same exact-SHA and integrity validator used by the coverage generator before it can add the reserved four runtime points.

If no exact-SHA artifact exists, closeout continues to report the missing Legal Rules proof and strict mode remains fail-closed. A repository copy from an older SHA never substitutes for the immutable current-SHA artifact.

## Automatic promotion PR

After a successful exact-main capture, the **Legal Rules Runtime Promotion** workflow receives the completed source run through `workflow_run` and performs a second trust-boundary validation:

1. source workflow conclusion is `success`;
2. source workflow event is `deployment_status`;
3. source head branch is `main`;
4. source head SHA equals the artifact SHA;
5. the SHA is still the current `main` commit;
6. the artifact is downloaded by exact source run ID and exact SHA-bound artifact name;
7. the downloaded bundle contains only the expected legal-rules evidence file;
8. the evidence is validated in an isolated evidence root;
9. repository binding, PASS state, deployment SHA, redaction, runtime-coverage eligibility and SHA-256 integrity are rechecked.

Only after these checks may the workflow use `contents: write` and `pull-requests: write`. It creates an ephemeral `automation/legal-rules-runtime-*` branch and opens a **draft PR** replacing only `docs/security/evidence/runtime/legal-rules-validation.json`.

The promotion workflow must never:

- push directly to `main`;
- approve or merge its own PR;
- enable auto-merge;
- modify code, workflows, migrations or unrelated evidence;
- replace conflicting PASS evidence for the same SHA;
- claim legal or production approval.

A sanitized promotion receipt is retained for 365 days. The source runtime artifact remains immutable and authoritative.

### Manual promotion replay

Use the promotion workflow's `workflow_dispatch` fallback only when the automatic `workflow_run` delivery is unavailable. Provide the exact current-main SHA, the successful source run ID and confirmation `PROMOTE_LEGAL_RULES_EVIDENCE`. Manual replay does not relax any artifact, SHA or current-main validation.

### Pull-request creation permission failure

GitHub repository Actions settings must allow workflows to create pull requests. If that setting is disabled, the promotion workflow fails after validating the artifact. Do not grant broader administrator permissions or bypass branch protection; enable only the repository-level ability for Actions to create pull requests, then replay the exact source run.

## Promotion procedure

1. Confirm the runtime validation run completed successfully and retained `legal-rules-runtime-<exact-sha>`.
2. Confirm the promotion workflow produced `legal-rules-runtime-promotion-<exact-sha>` when a repository copy is desired.
3. Review any draft promotion PR and verify it changes only the canonical legal-rules evidence file.
4. Confirm the PR artifact SHA-256, deployment SHA, source run ID and deployment origin match the immutable source artifact.
5. Treat the immutable exact-SHA artifact, not a stale repository copy, as the authoritative closeout overlay for the currently assessed SHA.
6. Regenerate EU AI Act product coverage and the technical scorecard from the exact assessed SHA.
7. Preserve both source and promotion artifacts; do not rely only on the repository copy.
8. Proceed to full deployment smoke, protected readiness, production providers, backup/restore and final closeout.

## Rollback

Follow `docs/compliance/LEGAL_RULES_RUNTIME_ROLLBACK_PLAN.md`. Runtime evidence is append-only: a rollback creates new evidence for the rollback SHA and never mutates proof for a prior SHA.

Disable the `deployment_status` trigger first if an event-routing incident is suspected. Disable the promotion workflow separately if branch or PR creation behaves unexpectedly. The protected endpoint and manual capture remain fail-closed while automation is investigated.

## Escalation

Escalate to qualified legal review when:

- official text and product rule disagree;
- application date, legal role, exception or transition is ambiguous;
- a source is corrected or superseded;
- a customer-specific classification is contested.
