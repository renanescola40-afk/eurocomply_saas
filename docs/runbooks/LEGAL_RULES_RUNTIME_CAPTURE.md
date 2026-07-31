# Legal Rules Runtime Capture Runbook

## Purpose

Capture the missing deployed, exact-SHA runtime evidence for the versioned EU AI Act legal-rules engine without treating CI, documentation, or an AI-generated artifact as legal approval.

The workflow produces operational runtime proof only. It does not create legal advice, qualified review, certification, customer conformity, regulator acceptance, or a notified-body conclusion.

## Preconditions

1. The target commit is deployed and its full lowercase 40-character Git SHA is known.
2. The deployment exposes the protected `GET /api/ops/legal-rules-validation` route.
3. The GitHub Actions secret `INTERNAL_CRON_SECRET` matches the deployed environment.
4. The deployment origin is HTTPS and contains no path, query string, credentials, or fragment.
5. The operator knows whether the environment reports itself as `production` or `staging`.

## Execution

Open **Actions → Legal Rules Runtime Capture → Run workflow** and provide:

- `deployment_url`: clean HTTPS origin, for example `https://app.example.com`;
- `deployment_sha`: exact deployed 40-character lowercase SHA;
- `environment_name`: expected runtime environment label;
- `confirm_runtime_capture`: `CAPTURE_EXACT_SHA`.

The workflow checks out the exact deployed SHA, runs the capture contract tests, calls the protected endpoint, verifies the response schema and digest, and uploads:

- `legal-rules-validation.json`;
- `capture-receipt.json`.

The artifact is retained for 90 days and is named with the environment and exact deployment SHA.

## Acceptance criteria

The run is acceptable only when all of the following are true:

- workflow conclusion is `success`;
- runtime status is `PASS`;
- all runtime test cases are `PASS`;
- artifact `deploymentSha` equals the operator-supplied SHA;
- artifact environment equals the expected environment;
- URL binding matches the clean deployment origin;
- artifact integrity SHA-256 validates;
- capture receipt contains a file-level SHA-256;
- `countsForRuntimeCoverage` is `true`;
- `legalAcceptanceGranted` remains `false`.

## Promotion into retained evidence

Do not manually edit the runtime proof. Download the workflow artifact, verify both SHA-256 values, and retain it in the controlled release evidence store for the exact deployment.

A repository update replacing the placeholder at `docs/security/evidence/runtime/legal-rules-validation.json` must preserve the captured JSON byte-for-byte except for an approved evidence-ingestion process. Any change of deployment SHA, rules version, source regulation, endpoint behavior, or digest requires a new capture.

## Failure handling

- **401/403:** verify the deployed secret and GitHub secret are aligned; never print the secret.
- **SHA mismatch:** confirm the deployment actually serves the supplied commit; do not weaken the check.
- **Environment mismatch:** use the environment label emitted by the deployed runtime or correct deployment configuration.
- **Digest mismatch:** treat the artifact as invalid and investigate serialization or endpoint tampering.
- **No-store/cookie failure:** correct the protected endpoint headers before retrying.
- **Runtime case failure:** remediate the legal-rules engine or deployment configuration; do not promote partial evidence.

## Rollback

Removing `.github/workflows/legal-rules-runtime-capture.yml` disables orchestration but does not alter the protected endpoint, capture script, placeholder evidence, or legal truth gates. The placeholder remains the source of truth until a valid exact-SHA runtime proof is retained.
