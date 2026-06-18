# P1 SBOM Attestation Evidence Builder

This helper writes the final P1 SBOM and artifact attestation evidence file from a reviewed local input file.

Run:

```bash
node scripts/security/build-p1-sbom-attestation-evidence.mjs input.json docs/security/evidence/p1/sbom-artifact-attestation.json
```

Then run the existing validator for the final file.

Only use reviewed release evidence. Do not mark the control complete with sample data.
