# P1 SBOM + artifact attestation CI

This document describes the automated evidence path for P1-06 `sbom-artifact-attestation`.

## What the workflow does

`.github/workflows/p1-sbom-attestation.yml` runs on pull requests that modify the supply-chain evidence path and on manual `workflow_dispatch`.

The workflow:

1. Checks out the repository with read-only contents permissions.
2. Installs dependencies without lifecycle scripts.
3. Validates the workflow contract with `scripts/security/check-p1-sbom-attestation-workflow.mjs`.
4. Generates a CycloneDX SBOM at `sbom.cdx.json`.
5. Validates that the generated SBOM is non-empty and contains components.
6. Writes `sbom.cdx.sha256`.
7. Uploads both files as the `p1-sbom-cyclonedx` GitHub Actions artifact.
8. Creates a GitHub artifact attestation for `sbom.cdx.json` using `actions/attest-build-provenance`.
9. Runs the final P1 evidence checker if `docs/security/evidence/p1/sbom-artifact-attestation.json` exists.

## Required GitHub permissions

The workflow intentionally grants only the permissions needed for this control:

- `contents: read`
- `actions: read`
- `attestations: write`
- `id-token: write`

## What counts as final evidence

P1-06 must remain `Open` until a reviewed workflow run proves all of the following:

- `sbom.cdx.json` was generated for the reviewed ref.
- The `p1-sbom-cyclonedx` artifact exists for the run.
- GitHub artifact attestation/provenance exists for the SBOM subject.
- The SBOM SHA-256 digest is captured.
- The evidence file includes the run URL, artifact name, attestation reference, reviewer, review date, and next review due date.

Only after those items are reviewed should `docs/security/evidence/p1/sbom-artifact-attestation.json` be created with `status: Complete` and the P1 evidence index be updated.

## Safety note

This workflow does not use Vercel, Supabase, Stripe, or application secrets. It should not require production credentials.
