# Final Legal Publication Gate

## Current expected state

- Repository preparation: `READY_FOR_COUNSEL_HANDOFF`
- Public legal surface: `INFORMATIONAL_REVIEW_DRAFT`
- Founder facts: `FOUNDER_FACT_REQUIRED`
- Qualified reviews: `HUMAN_REVIEW_REQUIRED`
- Master legal decision: `HUMAN_REVIEW_REQUIRED`
- Final publication: **blocked**

This is the correct state until real signed evidence is supplied. The gate treats missing evidence as a blocker, not as a failed repository implementation.

## Required accepted artifacts

The following paths are intentionally absent until real human actions occur:

1. `docs/compliance/evidence/accepted/founder-facts.json`
2. `docs/compliance/evidence/accepted/legal-rules-qualified-review.json`
3. `docs/compliance/evidence/accepted/prohibited-practices-legal-review.json`
4. `docs/compliance/evidence/accepted/article-50-copy-review.json`
5. `docs/compliance/evidence/accepted/fria-methodology-review.json`
6. `docs/compliance/evidence/accepted/deployer-obligations-legal-review.json`
7. `docs/compliance/evidence/accepted/high-risk-provider-methodology-review.json`
8. `docs/compliance/evidence/accepted/conformity-qualified-review.json`
9. `docs/compliance/evidence/accepted/gpai-legal-review.json`
10. `docs/compliance/evidence/accepted/master-legal-decision.json`

Do not place templates, examples or AI-generated placeholders at these paths.

## Acceptance conditions

Final legal publication is authorised only when:

- the exact final product SHA is available;
- signed founder facts identify the authorised officer and immutable facts digest;
- all eight qualified reviews pass reviewer identity, registration, jurisdiction, qualification, independence, conflict, exact-SHA, validity, signed-reference and digest checks;
- the master decision covers all eight workstreams and is valid for the same SHA and evidence-package digest;
- repository preparation validators pass;
- no blocking change has occurred after review.

An environment variable, UI toggle, admin action, CI success or package-completeness score cannot override these requirements.

## Commands

```bash
node scripts/compliance/check-final-legal-publication-gate.mjs --strict --write
node scripts/compliance/generate-legal-counsel-handoff-bundle.mjs --strict --write
```

`--strict` verifies repository-controlled preparation and truthful blocker reporting. It is expected to pass while human evidence is absent.

```bash
node scripts/compliance/check-final-legal-publication-gate.mjs --require-accepted
```

`--require-accepted` is the final publication/release gate and must fail until every accepted artifact is genuine and valid.

## Re-review triggers

Re-review is required after material changes to:

- intended purpose, AI functionality or legal classification logic;
- legal sources, application dates or guidance;
- public claims, Terms, Privacy, DPA, SLA or subprocessors;
- production regions, retention, transfers or AI providers;
- high-risk, prohibited-practice, FRIA, conformity or GPAI workflows;
- security commitments or evidence relied on by counsel.

## Public presentation

Until the gate is accepted, Trust Center legal pages must display a visible review-draft notice and remain informational. Signed customer agreements govern contractual commitments.
