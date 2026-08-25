# RISCK COMPLY — Free Counsel Review Pack

**Status:** `HUMAN_REVIEW_REQUIRED`  
**Purpose:** reduce the time and cost burden for a qualified pro bono / clinic reviewer.  
**Legal effect:** none until a qualified human reviewer returns an attributable decision.  
**Repository:** `renanescola40-afk/eurocomply_saas`  
**Preparation baseline SHA:** `fdaae94f5394092689ca86dd407df1775b7e9a96`  
**Review binding:** the reviewer must bind any final decision to the exact SHA and evidence digest actually reviewed.

## 1. Zero-cost boundary

This pack is intended only for a genuinely free / pro bono / university-clinic / public-authority review route.

Do not infer engagement or acceptance merely because a reviewer receives this pack.

The RISCK COMPLY promoter does **not** authorise through this pack:

- paid legal work;
- conversion to a paid engagement;
- provider or SaaS plan upgrades;
- formation of a new company;
- use of a family member's company or tax identifier as if it were already the RISCK COMPLY operator;
- publication of private founder identity data in the public repository.

If a reviewer cannot continue free of charge, the correct outcome is `NO_FREE_ROUTE_AVAILABLE`, not legal acceptance.

## 2. Founder / entity boundary

Current factual model:

- promoter / creator natural-person identity: `CONFIRMED_PRIVATELY`;
- RISCK COMPLY contracting / operating entity: `UNDECIDED`;
- a family-owned existing company may be considered later: `CANDIDATE_ONLY`;
- SaaS/software activity registration for the final operating entity: `NOT_YET_COMPLETED`;
- new-company formation: `OUT_OF_SCOPE` for this review lane.

A reviewer may assess the product and legal workstreams before the final operating entity is selected, subject to their own professional conflict and client-identification requirements. Any final opinion that requires a named client/entity remains incomplete until that requirement is satisfied.

## 3. Product in one paragraph

RISCK COMPLY is a B2B compliance-operations SaaS intended to help organisations inventory AI use, organise evidence, apply versioned governance rules, prepare assessments and documents, manage transparency / FRIA / high-risk workflows, and maintain auditability. The product is intended as governance and evidence support, not a substitute for legal advice or a final legal decision-maker. Most platform functions are deterministic software; individual AI-enabled features, if present, require module-level AI Act role/classification review.

## 4. Review material already prepared

The reviewer does not need to reconstruct the product from scratch. Start with:

1. `docs/legal-review-preparation/00_BASELINE_TRUTH_REPORT.md`
2. `docs/legal-review-preparation/01_PRODUCT_DOSSIER.md`
3. `docs/legal-review-preparation/02_INTENDED_PURPOSE.md`
4. `docs/legal-review-preparation/03_ARCHITECTURE_AND_DATA_FLOWS.md`
5. `docs/legal-review-preparation/05_SECURITY_CONTROL_MAP.md`
6. `docs/legal-review-preparation/06_RISCK_COMPLY_AI_ACT_CLASSIFICATION_MEMO.md`
7. `docs/legal-review-preparation/counsel-efficiency/COUNSEL_DECISION_CATALOG.json`
8. `docs/legal-review-preparation/review-packages/README.md`
9. `docs/legal-review-preparation/legal-pack/FINAL_DECISION_SHEET_TEMPLATE.json`
10. `docs/legal-review-preparation/legal-pack/MASTER_LEGAL_OPINION_HANDOFF.md`
11. `docs/legal-review-preparation/legal-pack/PRIVACY_POLICY_REVIEW_DRAFT.md`
12. `docs/legal-review-preparation/legal-pack/DATA_PROCESSING_ADDENDUM_REVIEW_DRAFT.md`
13. `docs/legal-review-preparation/legal-pack/SUBPROCESSOR_REGISTER_REVIEW_DRAFT.md`
14. `docs/legal-review-preparation/legal-pack/CLAIMS_REGISTER.json`

For each canonical workstream, the detailed package lives at:

`docs/legal-review-preparation/review-packages/<workstream>/PACKAGE.md`

## 5. Requested eight decisions

The request is deliberately bounded. For each workstream, review the linked package and return one of:

- `ACCEPTED`
- `ACCEPTED_WITH_CHANGES`
- `CHANGES_REQUIRED`
- `REJECTED`
- `OUTSIDE_SCOPE`

Silence, package completeness or CI success is not acceptance.

| ID | Workstream | Core question | Package |
|---|---|---|---|
| 1 | `legal-rules` | Are the legal-source mapping, applicability dates, product-role assumptions and operational limitations defensible for the intended product scope? | `review-packages/legal-rules/PACKAGE.md` |
| 2 | `prohibited-practices` | Does the product correctly identify/escalate Article 5 prohibited-practice risk without simplifying exceptions into automatic approval? | `review-packages/prohibited-practices/PACKAGE.md` |
| 3 | `article-50-copy` | Are the transparency triggers, notices, role allocation, timing and public/in-product wording adequate for current AI-enabled features? | `review-packages/article-50-copy/PACKAGE.md` |
| 4 | `fria-methodology` | Is the FRIA workflow a defensible assistance methodology, with sufficient boundaries so it does not imply that RISCK COMPLY itself completes a customer's legal assessment? | `review-packages/fria-methodology/PACKAGE.md` |
| 5 | `deployer-obligations` | Are deployer duties correctly allocated between RISCK COMPLY and customers, and are escalations/limitations adequate? | `review-packages/deployer-obligations/PACKAGE.md` |
| 6 | `high-risk-provider` | Could any current feature make RISCK COMPLY a high-risk AI-system provider/downstream provider, and are intended-purpose/substantial-modification boundaries correct? | `review-packages/high-risk-provider/PACKAGE.md` |
| 7 | `conformity` | Are conformity assessment, CE/registration and technical-documentation boundaries correctly represented as customer/provider obligations rather than automatically RISCK COMPLY obligations? | `review-packages/conformity/PACKAGE.md` |
| 8 | `gpai` | When third-party GPAI models are integrated, what provider/downstream-provider obligations attach to RISCK COMPLY, and are the current model/provider boundaries defensible? | `review-packages/gpai/PACKAGE.md` |

## 6. What a useful free review should return

A free reviewer does **not** need to draft a long memorandum. A short attributable response is useful if it contains:

1. reviewer name;
2. professional qualification / registration and jurisdiction;
3. scope of the review and any conflict/independence statement they can provide;
4. exact SHA or evidence package reviewed;
5. a decision for every workstream they accept within scope;
6. concise findings / required changes;
7. permitted reliance and limitations;
8. validity period or material-change triggers;
9. date and attributable signature / equivalent professional authentication.

A reviewer may accept only part of the eight-workstream scope. Partial qualified review is retained as partial evidence but does not create `LEGAL_8_OF_8` credit until all eight canonical workstreams are finally accepted under the internal acceptance contract.

## 7. Master opinion

After all eight workstreams are finally accepted, the desired final artifact is described in:

`docs/legal-review-preparation/legal-pack/MASTER_LEGAL_OPINION_HANDOFF.md`

The Master Legal Opinion remains `OPEN` until a qualified reviewer issues an attributable final artifact. Internal preparation, AI Office guidance, clinic correspondence or provider documents do not substitute for it.

## 8. Public-authority guidance boundary

Official guidance from the European Commission / AI Office is highly valuable evidence for interpreting the AI Act and should be retained with the relevant workstream. It is classified internally as `AUTHORITATIVE_GUIDANCE_SOURCE`, not automatically as an independent counsel opinion or `LEGAL_8_OF_8` acceptance.

## 9. Current acceptance state

```text
FREE_COUNSEL_PACK=READY_FOR_EXTERNAL_REVIEW
PROMOTER_IDENTITY=CONFIRMED_PRIVATELY
RISCK_COMPLY_CONTRACTING_ENTITY=UNDECIDED
LEGAL_8_OF_8=0/8_ACCEPTED
MASTER_LEGAL_OPINION=OPEN
```

This pack deliberately reduces reviewer effort without pre-answering the legal decisions reserved for qualified humans.
