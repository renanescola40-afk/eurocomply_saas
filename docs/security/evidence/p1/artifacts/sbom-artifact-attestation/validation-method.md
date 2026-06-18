# P1-06 validation method

Validation method used for P1-06 final evidence:

1. Locate PR #116 and confirm it merged the P1 SBOM attestation CI into `main`.
2. Locate workflow run `27779627063` for head SHA `181456bfebeb12a0674791a08307b4c69dc46604`.
3. Confirm the workflow `P1 SBOM and Artifact Attestation` completed successfully.
4. Confirm job `82200790960` completed successfully.
5. Confirm the job steps for SBOM generation, SBOM validation, artifact upload, and artifact provenance attestation completed successfully.
6. Confirm artifact `p1-sbom-cyclonedx` exists, is not expired, and has digest `sha256:23dfdfe29e24cdba79ff00f92b5fe436b2c671802ec2764ecaea7046cb1eeb3d`.
7. Record the evidence in `docs/security/evidence/p1/sbom-artifact-attestation.json` and update the P1 evidence index.
