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

## Founder-facts completion contract

A founder-facts artifact is not accepted merely because it has a valid-looking status, SHA, officer name and digest. The final gate requires:

- schema `risck-comply.founder-facts.v1`;
- `status = FOUNDER_FACTS_CONFIRMED`;
- `productSha` equal to the exact frozen release SHA;
- every required factual field from the founder questionnaire resolved;
- no plain `unknown`, `TBD`, `TODO`, `pending`, `N/A`, empty value or `null` in a required factual field;
- genuinely non-applicable facts represented as a structured `NOT_APPLICABLE`/`NOT_REQUIRED` object with a substantive rationale;
- authorised officer name and role;
- a valid confirmation timestamp that is not in the future;
- confidential signed-artifact reference;
- SHA-256 `factsDigest`.

Example of a valid structural non-applicability declaration:

```json
{
  "status": "NOT_APPLICABLE",
  "rationale": "Explain why this fact genuinely does not apply to the current operating model."
}
```

This structure records a factual disposition only. It does not turn an operating choice into legal approval and does not replace qualified counsel where legal interpretation is required.

The CLI report emits `founderFactsUnresolvedFields` so a signed envelope cannot hide unresolved fact blocks behind otherwise complete metadata.

## Qualified-review final-credit contract

Each of the eight qualified-review artifacts is validated directly by the final publication gate rather than receiving final credit from an aggregate/intermediate score. A review receives final publication credit only when all of the following hold:

- schema `risck-comply.qualified-review-decision.v1`;
- `reviewPackageId` matches the canonical workstream assigned to that exact accepted-evidence path;
- decision is finally `ACCEPTED` or `COUNSEL_ACCEPTED`;
- reviewer name, professional registration, jurisdiction, qualification scope, conflict assessment, independence declaration and review scope are substantive and non-placeholder;
- `productSha` equals the exact frozen release SHA;
- `evidencePackageDigest` and `decisionDigest` are SHA-256 digests;
- the signed artifact reference is present;
- the decision timestamp is valid and not in the future;
- the validity window is current;
- placeholder/template content is not accepted as genuine evidence.

`ACCEPTED_WITH_CHANGES` is **not final publication credit**. It means specified changes must first be implemented and verified; qualified counsel must then issue or confirm a final accepted record bound to the resulting exact SHA before the final gate can count that workstream.

The CLI report emits each canonical review ID, path, acceptance state and validation failures. Eight files existing is not equivalent to eight valid decisions.

## Master legal-decision contract

The master legal decision is accepted only when it independently proves the final bounded opinion rather than merely containing eight accepted-looking array items. The gate requires:

- schema `risck-comply.master-legal-decision-sheet.v1`;
- final decision `ACCEPTED` or `COUNSEL_ACCEPTED`;
- complete qualified-reviewer identity, registration, jurisdiction, qualification, conflict and independence fields;
- exact `productSha`, SHA-256 evidence-package and decision digests, signed opinion reference and current review/validity dates;
- at least one substantive `changeTriggers` entry;
- all seven global decisions finally accepted: intended purpose, product role, launch position, contract pack, privacy/DPA, claims and partner-counsel model;
- exactly the eight canonical **unique** workstream IDs: `legal-rules`, `prohibited-practices`, `article-50-copy`, `fria-methodology`, `deployer-obligations`, `high-risk-provider`, `conformity`, `gpai`;
- every canonical workstream finally accepted;
- substantive `permittedReliance`;
- at least one substantive limitation/exclusion;
- `blockingChanges` empty;
- no unresolved placeholder/template content.

Repeating one accepted workstream eight times, omitting a global decision, leaving reliance/limitations undefined or retaining an unresolved blocking change cannot produce master-decision credit.

The CLI report emits `masterDecisionFailures` to make the rejection reason auditable without exposing confidential opinion content.

## Acceptance conditions

Final legal publication is authorised only when:

- the exact final product SHA is available;
- signed founder facts satisfy the complete factual-field contract above and identify the authorised officer and immutable facts digest;
- all eight qualified reviews satisfy the direct final-credit contract above;
- the master decision satisfies the independent master-decision contract above for the same exact release/evidence package;
- repository preparation validators pass;
- no blocking change has occurred after review.

An environment variable, UI toggle, admin action, CI success, filled envelope, aggregate score or package-completeness metric cannot override these requirements.

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
