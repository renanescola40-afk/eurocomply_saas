# Article 50 Runtime Evidence Promotion

## Purpose

Promote only evidence generated for the exact commit under assessment. This runbook does not convert CI fixtures into customer or production proof.

## Required checks

1. Confirm the workflow SHA equals the target deployment SHA.
2. Confirm every focused Article 50 test passed before evidence generation.
3. Validate the evidence digest with `validate-article-50-runtime-evidence.mjs`.
4. Recalculate the EU AI Act product score using the artifact overlay.
5. Retain the workflow artifact for 90 days.
6. Keep `syntheticData=true` and `environment=ci` for this evidence class.

## Promotion command

```bash
TARGET_SHA=<full-sha> \
EU_AI_ACT_RUNTIME_EVIDENCE_ROOTS=artifacts/article-50-runtime \
node scripts/compliance/generate-eu-ai-act-product-coverage.mjs
```

## Rejection conditions

Reject the evidence when:

- the SHA differs by one character;
- the digest does not match;
- any test case is not `PASS`;
- limitations are missing;
- the artifact claims production or customer evidence;
- the legal-source or dashboard invariant tests were skipped;
- the artifact was created before a material Article 50 code change.

## External evidence boundary

Customer proof of display, machine-readable marking, translation equivalence and qualified legal review remain separate evidence classes. They cannot be inferred from this CI artifact.
