# CircleCI #416 — read-only failure triage

Scope: read-only source CI diagnostics, no new jobs, no reruns, no credits, no production or Stripe writes.

## Confirmed problem

GitHub status ci/circleci: github-actions-recovery-quality for source SHA a616067953e37a56693b5852eda6e1a59e9d6d5a reports job 416 FAILED. GitHub status does not disclose the first failing step or full output. Do NOT attribute #416 to code or infrastructure until step evidence exists. A separate CircleCI manual workflow/branch mismatch was corrected in PR #2598; this is not retroactive proof of #416.

## Read-only diagnostic

CircleCI API v1.1 GET /api/v1.1/project/gh/renanescola40-afk/eurocomply_saas/416 returns job step names, exit codes, and presigned step-output URLs.

With Node.js 22 and a CircleCI token already held privately in the approved execution environment:

1. node scripts/ci/circleci-readonly-diagnose.mjs --job 416
   - GET metadata only, no raw logs or secrets printed.
2. If necessary: node scripts/ci/circleci-readonly-diagnose.mjs --job 416 --fetch-step-output
   - Reads only the first failed step and prints conservative classification without printing the raw output, signed URL, or token.
3. Offline test: node --test tests/ci/circleci-readonly-diagnose.test.mjs

The token must be supplied in the private environment variable CIRCLECI_TOKEN. Never paste a token into a chat, PR, issue, commit, or command argument. Without a previously configured credential, the diagnostic fails closed with missing_CIRCLECI_TOKEN_readonly. It never triggers or retries a pipeline.

## Interpretation

- FAILED_WITHOUT_STEP_DETAILS: No steps available; do not call it a code failure.
- RESOURCE_EXHAUSTION: Exit 137 or OOM.
- INFRASTRUCTURE_OR_NETWORK: Runner, image, checkout, DNS or network signals.
- DEPENDENCY_OR_LOCKFILE: npm/lockfile install failure.
- CI_CONFIGURATION_OR_POLICY: Branch, exact SHA, credential guard or config issue.
- SOURCE_OR_TEST_FAILURE: Real assertion, TypeScript or lint diagnostics.
- QUALITY_STEP_FAILED_CAUSE_UNKNOWN: Failing quality step without raw diagnostics.

This classification is NOT formal QAT-01 or A-15 acceptance. Exact SHA test and scanner coverage plus independent acceptance are still required.

Official references:
https://circleci.zendesk.com/hc/en-us/articles/32887967598619-Retrieving-job-step-output-via-the-API
https://circleci.com/docs/guides/orchestrate/analyze-pipelines-during-an-incident/
