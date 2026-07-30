# Legal Rules Runtime Validation Runbook

## Purpose

Capture immutable, exact-SHA runtime evidence that the deployed legal-rules registry and canonical EU AI Act decision engine behave as expected.

This runbook does not replace the full production smoke, qualified legal review or final release approval.

## Preconditions

- CI is green for the exact commit to be deployed.
- The deployment exposes `/api/public/legal-rules-validation`.
- Runtime release metadata returns the full 40-character deployed Git SHA.
- The deployment URL is an HTTPS origin without credentials, query parameters or fragments.
- The operator knows whether the target is `preview` or `production`.

## Canonical execution

Use the **Legal Rules Runtime Validation** GitHub Actions workflow with:

- `deployment_url`: exact deployment origin;
- `expected_sha`: full deployed SHA;
- `environment`: `preview` or `production`.

Equivalent local operator command:

```bash
install -d -m 700 docs/security/evidence/runtime
umask 077
DEPLOYMENT_URL="https://target.example" \
EXPECTED_DEPLOYMENT_SHA="<40-character-sha>" \
node scripts/compliance/capture-legal-rules-runtime-evidence.mjs \
  > docs/security/evidence/runtime/legal-rules-validation.json
```

The JavaScript validator never writes the network response directly to the file system. It validates an exact allow-list of fields, sizes, paths, SHA values, timestamps, redaction declarations and integrity metadata, then emits only the accepted canonical JSON on stdout. The workflow controls the fixed output path with a restrictive umask.

## PASS criteria

The capture succeeds only when all of the following are true:

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

### Rate limited

- Confirm the caller is not looping.
- Retry only after the rate-limit window.
- Do not weaken the distributed rate limit for evidence collection.

### Vercel deployment quota or provider limit

Record `BLOCKED — external provider quota/rate limit`. Continue repository-side CI and PR review, but do not claim runtime verification or production readiness.

## Promotion procedure

1. Download the workflow artifact for the exact SHA.
2. Verify its workflow run, repository, SHA and retention metadata.
3. Replace the canonical `NOT_EXECUTED` placeholder only with the verified PASS document.
4. Regenerate EU AI Act product coverage with the exact SHA and artifact root.
5. Regenerate the technical scorecard.
6. Preserve the original workflow artifact; do not rely only on a repository copy.
7. Proceed to full deployment smoke, protected readiness, production providers, backup/restore and final closeout.

## Rollback

Follow `docs/compliance/LEGAL_RULES_RUNTIME_ROLLBACK_PLAN.md`. Runtime evidence is append-only: a rollback creates new evidence for the rollback SHA and never mutates proof for a prior SHA.

## Escalation

Escalate to qualified legal review when:

- official text and product rule disagree;
- application date, legal role, exception or transition is ambiguous;
- a source is corrected or superseded;
- a customer-specific classification is contested.
