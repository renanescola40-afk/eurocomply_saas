# Runbook: Stripe Runtime Evidence Promotion

## Preconditions

- target SHA is the current tip of `main`;
- Stripe test-mode event was signed and delivered;
- runtime proof workflow passed;
- sanitized artifact name matches the release SHA;
- protected `production` environment reviewers are available.

## Execution

Run `Stripe Runtime Evidence Promotion` with:

- `release_sha`: full 40-character current `main` SHA;
- `runtime_artifact_run_id`: source runtime-proof workflow run;
- `confirmation`: `PROMOTE_STRIPE_RUNTIME_EVIDENCE`.

## Expected output

- `promoted-evidence.json` with `Complete / passed`;
- `SHA256SUMS`;
- workflow summary showing exact SHA, replay validation and redaction validation;
- retained artifact named `stripe-runtime-evidence-promoted-<sha>`.

## Failure handling

- SHA mismatch: rerun runtime proof against current `main`; never edit the artifact.
- replay failure: stop promotion and investigate idempotency before another event.
- missing correlation: confirm entitlement migrations, source metadata and organization binding.
- sensitive data detected: delete the workflow artifact according to incident policy and rotate exposed credentials when applicable.
- source artifact missing: rerun the runtime proof; do not reconstruct evidence manually.

## Rollback

The workflow performs no repository or database writes. Disable the workflow if compromised, preserve trustworthy prior artifacts, and require a fresh exact-SHA proof before release approval.
