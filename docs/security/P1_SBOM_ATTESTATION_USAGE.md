# P1 SBOM and Artifact Attestation Evidence Workflow

This control tracks SBOM generation and artifact attestations for release artifacts.

## Files

- Template: `docs/security/evidence/p1/sbom-artifact-attestation.template.json`
- Final evidence: `docs/security/evidence/p1/sbom-artifact-attestation.json`
- Checker: `scripts/security/check-p1-sbom-attestation-evidence.mjs`

## Workflow

1. Generate an SBOM for the release artifact.
2. Produce and verify artifact attestation for the same artifact digest.
3. Copy the template to the final evidence path.
4. Replace placeholders with reviewed, redacted references.
5. Run:

```bash
node scripts/security/check-p1-sbom-attestation-evidence.mjs
```

6. Update `docs/security/P1_ENTERPRISE_SECURITY_REGISTER.md` from `Open` to `Complete` or approved `Exception`.
7. Open a final evidence PR.

## Completion criteria

The evidence must show:

- SBOM is generated for release artifacts;
- artifact attestation exists for release artifacts;
- attestation subject digest matches the released artifact;
- verification workflow or command is documented;
- no secrets or access-granting values are committed.

This preparation PR does not close the control by itself.
