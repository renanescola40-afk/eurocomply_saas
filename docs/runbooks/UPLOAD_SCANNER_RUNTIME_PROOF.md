# Runbook — Upload malware scanner runtime proof

## Purpose

Generate and consume fresh, exact-SHA evidence that the upload security path:

- allows a clean PDF fixture;
- blocks an industry-standard malicious test fixture;
- fails closed when the scanner is unavailable or returns a non-clean verdict;
- does not retain scanner credentials, raw responses, signature names or fixture bytes.

## Workflows

### Producer

- **Workflow:** `RISCK COMPLY Upload Security CI`
- **File:** `.github/workflows/upload-security-ci.yml`
- **Artifact:** `upload-security-runtime-proof-<40-character-sha>`

### Consumer

- **Workflow:** `P0 Runtime Evidence`
- **File:** `.github/workflows/p0-runtime-evidence.yml`
- **Output artifact:** `p0-runtime-evidence-register-<40-character-sha>`

## Normal operation

1. Merge a validated change to `main`.
2. `RISCK COMPLY Upload Security CI` starts automatically for the integrated SHA.
3. The workflow waits for the ClamAV service to return `PONG`.
4. Static upload, content-scan and enterprise bypass gates run.
5. The clean PDF fixture must return a clean verdict.
6. The in-memory antivirus test fixture must return a blocked verdict.
7. The workflow normalizes and validates repository, branch, SHA, run ID and attempt.
8. The exact-SHA artifact is uploaded.
9. Successful completion triggers `P0 Runtime Evidence` through `workflow_run`.
10. The consumer downloads and validates the exact artifact before generating the P0 register.

## Expected success evidence

The canonical JSON must contain:

- `status=Complete`;
- `outcome=passed`;
- canonical repository;
- `branch=main` for P0 promotion;
- exact integrated SHA;
- numeric run ID and attempt;
- stable workflow name and file;
- real provider flag;
- clean scan status;
- fail-closed acceptance criteria;
- redaction/integrity flags.

The blocking proof must contain:

- `status=Complete`;
- `scanner.classification=blocked`;
- in-memory fixture generation;
- no fixture bytes, raw response or signature name persisted.

## Failure triage

### ClamAV does not become ready

Symptoms:

- repeated `Waiting for ClamAV scanner` messages;
- failure before clean or blocking proof.

Actions:

1. Inspect service-container logs.
2. Confirm port `3310` is exposed.
3. Check upstream container availability and signature initialization.
4. Re-run only after the upstream service is healthy.
5. Do not bypass the readiness wait or replace the provider with `mock`.

### Clean fixture is blocked

Symptoms:

- clean proof status is not `Complete`;
- scan status is infected, suspicious, error or unavailable.

Actions:

1. Inspect the normalized reason code only.
2. Do not publish raw scanner responses.
3. Verify the fixture hash and scanner definitions.
4. Treat as a possible false positive or provider incident.
5. Keep enterprise uploads blocked until resolved.

### Malicious test fixture is not blocked

Symptoms:

- blocking classification is `unexpected_clean`, `unrecognized`, `scanner_error` or `timeout`.

Actions:

1. Stop release promotion.
2. Verify the workflow is connected to the intended ClamAV service.
3. Confirm the INSTREAM protocol is enabled.
4. Inspect ClamAV initialization/signature update logs.
5. Do not alter the test to accept an `OK` response.

### Normalization or validator fails

Common reasons:

- SHA mismatch;
- branch mismatch;
- missing run ID/attempt;
- workflow identity mismatch;
- provider response persistence flag is not false;
- evidence older than seven days.

Actions:

1. Confirm the workflow checked out `TARGET_SHA`.
2. Confirm no dynamic top-level `run-name` was introduced.
3. Confirm artifact name includes the full SHA.
4. Re-run the producer workflow for the current `main` SHA.
5. Never edit the generated JSON to force a pass.

### P0 cannot retrieve the artifact

Common reasons:

- producer workflow failed or was cancelled;
- artifact expired;
- artifact name mismatch;
- producer run is from a PR or another branch;
- source SHA differs from assessed SHA;
- duplicate artifacts exist.

Actions:

1. Locate the successful producer run for the current `main` SHA.
2. Verify exactly one non-expired artifact has the expected name.
3. Re-run the producer if the artifact expired.
4. Do not use a PR artifact for production P0 evidence.
5. If duplicates exist, investigate the producing workflow before retrying.

### Unsafe ZIP rejection

Symptoms:

- `artifact_zip_unsafe_entry`;
- `artifact_zip_entry_limit_exceeded`;
- `artifact_evidence_entry_not_unique`.

Actions:

1. Treat as artifact-integrity failure.
2. Inspect only filenames and metadata; do not extract the archive broadly.
3. Confirm the producer uploads the documented bounded path set.
4. Re-run from a trusted exact-SHA workflow after correcting the producer.

## Manual revalidation

Use GitHub Actions to dispatch `RISCK COMPLY Upload Security CI` on `main`. The workflow does not require repository write permission and must not use `--update-register`.

After it succeeds, confirm that `P0 Runtime Evidence` was triggered for the same SHA. If GitHub does not emit the downstream event, dispatch `P0 Runtime Evidence` manually for the current `main` SHA; its fetcher still requires an existing successful exact-SHA producer artifact.

## Security boundaries

Do not:

- commit scanner credentials or endpoints;
- paste raw ClamAV responses into issues or PRs;
- store scanner signature names;
- commit the malicious test fixture as a contiguous string;
- use mock providers for Enterprise proof;
- promote evidence from a PR branch;
- edit the P0 register or evidence JSON to manufacture completion;
- enable `contents: write` for either workflow.

## Rollback

Revert the following as one unit:

- evidence normalizer;
- artifact fetcher;
- exact-SHA validator changes;
- blocking proof script;
- producer workflow changes;
- P0 workflow integration;
- tests, schema, ADR, threat model and this runbook.

After rollback, the P0 upload scanner item must remain `Open` until a replacement fresh runtime proof exists.
