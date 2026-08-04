# Article 50 Runtime Evidence Closure

## Closed technical gap

The canonical EU AI Act registries previously counted a generic localization artifact for the Article 50 workstream. That artifact could not prove the operational effective-date resolver, provider/deployer separation, tenant-scoped API, assessment versioning, evidence scoping or safe dashboard deadline rendering.

This closure introduces a dedicated exact-SHA evidence pipeline for those controls.

## Evidence chain

1. Focused Article 50 unit and contract tests execute.
2. Evidence is generated only after those tests pass.
3. The artifact records the exact Git SHA, CI environment, synthetic-data status, limitations and control outcomes.
4. A SHA-256 integrity digest covers the complete evidence payload.
5. A separate validator rejects stale SHA, malformed status, failed cases, missing limitations or digest tampering.
6. Product coverage is recalculated with the retained artifact as an overlay.

## Honest coverage boundary

The resulting artifact supports **CI runtime evidence coverage** for the implemented product workflow. It does not establish:

- that a customer's disclosure was displayed;
- that a customer's generated content contains valid machine-readable marking;
- that translations are legally equivalent;
- that a qualified reviewer accepted the Article 50 copy;
- that a regulator approved the system;
- that the customer is legally compliant.

## Human review

`docs/compliance/evidence/accepted/article-50-copy-review.json` remains mandatory for completed coverage. No reviewer identity, qualification, independence or signature is fabricated by this closure.

## Expected score effect

After the workflow succeeds for the exact assessed SHA and the artifact overlay is supplied, the Article 50 workstream may advance to `RUNTIME_VERIFIED`. It remains `HUMAN_REVIEW_REQUIRED` until the real qualified review is accepted.
