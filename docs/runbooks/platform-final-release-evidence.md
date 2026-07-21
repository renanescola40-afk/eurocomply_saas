# Platform final release evidence closeout

## Purpose

Produce one redacted, exact-SHA platform evidence pack that closes the repository-side release-assurance workstream for GitHub, Vercel, Supabase/Auth, Stripe and Sentry.

This pack consolidates evidence. It does not deploy, modify provider settings, execute OAuth, send webhooks, create Sentry events or perform rollback.

## Required evidence lanes

All five lanes must report `PASS` for the exact same release SHA:

1. `provider_configuration`
2. `deployment_provenance`
3. `provider_interoperability`
4. `provider_transactions`
5. `sentry_source_maps`

Each lane requires:

- `status: PASS`;
- the exact 40-character production `release_sha`;
- a recent UTC `observed_at`;
- `artifact_sha256` containing the SHA-256 digest of the retained source artifact.

The Sentry lane additionally requires:

- `release` equal to the exact Git SHA;
- `processing_status: PASS` confirming source-map processing.

## Protected GitHub environment

Create or verify:

`production-platform-closeout`

Add the variable:

- `PLATFORM_EVIDENCE_MAX_AGE_HOURS` — recommended value `168`.

Add the secret:

- `PLATFORM_FINAL_RELEASE_EVIDENCE_JSON` — completed JSON following `evidence/platform/final-release.example.json`.

Do not include provider secrets, tokens, cookies, user identities, customer payloads or raw transaction receipts.

## Procedure

1. Select the exact production SHA currently at `main`.
2. Execute the protected provider configuration workflow.
3. Execute deployment provenance and rollback proof.
4. Execute provider interoperability proof.
5. Execute the controlled OAuth, Stripe webhook and Sentry transaction evidence workflow.
6. Confirm Sentry release and source-map processing for the same SHA.
7. Calculate SHA-256 for every retained artifact.
8. Build the protected JSON using the example schema.
9. Open **Actions → Platform Final Release Evidence**.
10. Enter the exact production SHA and set `strict_runtime=true`.
11. Approve the protected environment.
12. Retain `platform-final-release-evidence-<sha>` with release records.

## PASS decision

The final artifact reports:

`PLATFORM_RELEASE_EVIDENCE_COMPLETE`

only when every required lane is present, fresh, redacted, digest-addressed and bound to the exact current `main` SHA.

Any missing, stale, mismatched or failed lane produces:

`NO_GO`

## Sentry source-map evidence

The retained Sentry source-map artifact should prove, without PII:

- the Sentry release identifier equals the Git SHA;
- source maps were uploaded for that release;
- processing completed successfully;
- a synthetic event for the same release resolves to application source rather than minified-only frames;
- the source artifact digest is retained outside the repository.

Do not put event payloads, user data, auth headers or Sentry tokens into the closeout JSON.

## Completion boundary

A PASS closes the repository-side platform access and external-provider evidence workstream for the tested SHA and observation window. It does not certify the entire SaaS, prove legal compliance, replace product acceptance, or eliminate future operational monitoring.
