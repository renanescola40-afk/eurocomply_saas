# RISCK COMPLY — Free Counsel Review Pack

**Status:** `HUMAN_REVIEW_REQUIRED`  
**Purpose:** reduce the time and cost burden for a qualified pro bono / clinic reviewer.  
**Legal effect:** none until a qualified human reviewer returns an attributable decision.  
**Repository:** `renanescola40-afk/eurocomply_saas`  
**Current truth snapshot:** `43bf6b1368ff7a3b8ead0aa434b83bed9457615e` on 2026-09-10  
**Review binding:** the reviewer must bind any final decision to the exact SHA/evidence digest actually reviewed, not automatically to this preparation snapshot.

## 1. Zero-cost boundary

This pack is intended only for a genuinely free / pro bono / university-clinic / public-authority review route unless the owner separately authorises a paid engagement.

Do not infer engagement or acceptance merely because a reviewer receives this pack.

This pack does **not** authorise:

- paid legal work;
- conversion to a paid engagement;
- provider or SaaS plan upgrades;
- formation of a new company;
- execution of binding declarations or contracts;
- publication of private founder identity data beyond facts deliberately approved for the legal document concerned.

If a reviewer cannot continue within the authorised route, the correct outcome is `NO_AUTHORISED_ROUTE_AVAILABLE`, not legal acceptance.

## 2. Operator / contracting-entity boundary

Current attributable operating model for review preparation:

```text
RISCK_COMPLY_TRADE_NAME=RISCK_COMPLY
RISCK_COMPLY_OPERATOR_ENTITY=SAMUEL_CERQUEIRA_UNIPESSOAL_LDA_OWNER_DESIGNATED
RISCK_COMPLY_CONTRACTING_ENTITY=OPEN_OWNER_CONFIRMATION
AUTHORITATIVE_REGISTRY_EVIDENCE=PENDING
REGISTERED_OFFICE=PENDING_AUTHORITATIVE_EVIDENCE
REGISTERED_IDENTIFIERS=PENDING_AUTHORITATIVE_EVIDENCE
SIGNATORY_AUTHORITY=PENDING_WHERE_REQUIRED
```

Later owner/operator correspondence identifies **SAMUEL CERQUEIRA, UNIPESSOAL LDA** as the operator of RISCK COMPLY in Portugal. That evidence does not expressly designate the same company as the customer-contract counterparty. Counsel must therefore treat the contracting entity as an open owner fact rather than infer it from operator status.

The pack also does not license the reviewer to invent the registered office, company/tax identifiers, corporate objects or signatory authority. Any final opinion or public legal text requiring those fields must use authoritative registry/owner evidence.

## 3. Product in one paragraph

RISCK COMPLY is a B2B compliance-operations SaaS intended to help organisations inventory AI use, organise evidence, apply versioned governance rules, prepare assessments and documents, manage transparency / FRIA / high-risk workflows, and maintain auditability. The product is intended as governance and evidence support, not a substitute for legal advice or a final legal decision-maker. Most platform functions are deterministic software; individual AI-enabled features, if present, require module-level AI Act role/classification review.

## 4. Current implementation state relevant to counsel

The reviewer does not need to reconstruct the legal implementation from scratch. As of the current truth snapshot:

```text
PRIVACY_PUBLIC_REVIEW_SURFACE=IMPLEMENTED_AND_LIVE_REVIEW_DRAFT
DPA_PUBLIC_REVIEW_SURFACE=MERGED
SUBPROCESSORS_TRANSFERS_REVIEW_SURFACES=MERGED
TERMS_PUBLIC_REVIEW_SURFACE=IMPLEMENTED_AND_LIVE_REVIEW_DRAFT
GDPR_RIGHTS_SOURCE_AND_EXACT_SHA_TECHNICAL_GATE=PASS
LEGAL_8_OF_8=0/8_ACCEPTED
MASTER_LEGAL_OPINION=OPEN
```

The public Privacy and Terms pages deliberately identify themselves as `REVIEW_DRAFT · HUMAN_REVIEW_REQUIRED`; they are not represented as effective legal approval.

Provider/account factual evidence has also advanced, including a direct Supabase Privacy Team statement about DPA incorporation and an attributable PostHog DPA completion notice. Those provider facts do not resolve Chapter V/transfer legal conclusions, customer-contract counterparty identity or every account-specific configuration fact.

## 5. Review material already prepared

Start with the smallest bounded set required for the workstream being reviewed. Relevant materials include:

1. `docs/legal-assurance/CLOSURE_STATUS_2026-09-09.md`
2. `docs/legal-assurance/LEGAL_CLOSURE_SCORECARD_V7.md`
3. `docs/legal-review-preparation/00_BASELINE_TRUTH_REPORT.md`
4. `docs/legal-review-preparation/01_PRODUCT_DOSSIER.md`
5. `docs/legal-review-preparation/02_INTENDED_PURPOSE.md`
6. `docs/legal-review-preparation/03_ARCHITECTURE_AND_DATA_FLOWS.md`
7. `docs/legal-review-preparation/05_SECURITY_CONTROL_MAP.md`
8. `docs/legal-review-preparation/06_RISCK_COMPLY_AI_ACT_CLASSIFICATION_MEMO.md`
9. `docs/legal-review-preparation/counsel-efficiency/COUNSEL_DECISION_CATALOG.json`
10. `docs/legal-review-preparation/review-packages/README.md`
11. `docs/legal-review-preparation/legal-pack/FINAL_DECISION_SHEET_TEMPLATE.json`
12. `docs/legal-review-preparation/legal-pack/MASTER_LEGAL_OPINION_HANDOFF.md`
13. the current canonical public/source Privacy, DPA, Subprocessors/Transfers and Terms review surfaces.

For each canonical AI Act workstream, the detailed package lives at:

`docs/legal-review-preparation/review-packages/<workstream>/PACKAGE.md`

Use delta review where possible. A reviewer should not be asked to review the entire repository if a bounded evidence pack answers the legal question.

## 6. Requested eight decisions

`docs/legal-review-preparation/counsel-efficiency/COUNSEL_DECISION_CATALOG.json` is the canonical decision vocabulary. `HUMAN_REVIEW_REQUIRED` is the pre-review/default state. When a reviewer reaches a disposition for an in-scope workstream, use one of the canonical review decisions:

- `ACCEPTED`
- `ACCEPTED_WITH_CHANGES`
- `CHANGES_REQUIRED`
- `REJECTED`
- `OUTSIDE_SCOPE`

Do not introduce a parallel decision value that cannot be represented in the canonical catalogue. If an applicability question is outside a reviewer's scope, record `OUTSIDE_SCOPE` plus the substantive rationale in the findings/comments rather than inventing a new enum. Silence, package completeness, source implementation, CI success or provider correspondence is not acceptance.

| # | Canonical workstream | Core question | Package family |
|---:|---|---|---|
| 1 | `legal-rules` | Are AI Act applicability, role classification, regulatory-rule versioning and product-role assumptions defensible for the intended product scope? | `legal-rules` |
| 2 | `prohibited-practices` | Does the product correctly identify/escalate prohibited-practice risk and exception boundaries without converting exceptions into automatic approval? | `prohibited-practices` |
| 3 | `article-50-copy` | Are transparency triggers, notices, role allocation, timing and customer-facing wording adequate for current AI-enabled features? | `article-50-copy` |
| 4 | `fria-methodology` | Is the FRIA workflow a defensible assistance methodology with correct applicability and responsibility boundaries? | `fria-methodology` |
| 5 | `deployer-obligations` | Are deployer obligations correctly allocated between RISCK COMPLY and customers, with adequate escalation and limitations? | `deployer-obligations` |
| 6 | `high-risk-provider` | Could a current feature make RISCK COMPLY a high-risk AI-system provider/downstream provider, and are intended-purpose/substantial-modification boundaries correct? | `high-risk-provider` |
| 7 | `conformity` | Are conformity assessment, CE marking, registration and technical-documentation boundaries allocated correctly? | `conformity` |
| 8 | `gpai` | For any third-party GPAI/model workflow, what provider/deployer/customer obligations attach and are current boundaries defensible? | `gpai` |

## 7. Minimum evidence required for an accepted decision

For every workstream credited toward `LEGAL_8_OF_8`, retain:

1. qualified reviewer identity;
2. relevant qualification / professional competence;
3. jurisdiction / professional scope;
4. conflict / independence disclosure where applicable;
5. exact review scope and legal question;
6. materials reviewed;
7. product/release subject and exact applicable SHA or controlled evidence package;
8. substantive findings;
9. canonical review decision;
10. conditions or required assumptions;
11. material-change / re-review triggers;
12. date;
13. attributable authenticated/signed response or equivalent professional authentication.

A reviewer may cover more than one workstream in one signed response if each workstream has a clear attributable decision and findings. Partial review is retained as partial evidence but receives credit only for workstreams satisfying the repository's complete acceptance contract. `ACCEPTED_WITH_CHANGES` does not by itself prove that required changes were implemented or re-reviewed; downstream acceptance must follow the canonical evidence rules.

## 8. GDPR / commercial review questions that can be reviewed in parallel

Without delaying the eight AI Act workstreams, qualified counsel may also review the bounded unresolved legal decisions for:

- final Privacy legal bases / legitimate-interest allocation and DPO applicability;
- controller/processor allocation and Article 28 DPA sufficiency;
- subprocessor authorisation/notice/objection mechanics;
- international-transfer treatment, SCC/adequacy/TIA and supplementary-measure conclusions where applicable;
- Terms formation/precedence, renewal and suspension mechanics;
- refund position and post-termination export/deletion wording;
- liability cap/carve-outs, indemnities, warranties/remedies, notices and governing-law/forum mechanics;
- final legal publication criteria.

Existing owner positions for counsel review include end-of-paid-period self-service cancellation, no default refund subject to mandatory law/order form, a 30-day export-window position, no default uptime SLA unless contracted, and a Portuguese-law preference. They are owner positions, not pre-approved legal conclusions.

## 9. Master Legal Opinion

After all eight workstreams have valid terminal decisions satisfying the acceptance contract, obtain a consolidated Master Legal Opinion / equivalent attributable qualified conclusion covering:

- scope and product;
- confirmed operator and separately confirmed contracting entity;
- release/evidence subject;
- all eight workstream outcomes;
- assumptions and limitations;
- customer versus RISCK COMPLY responsibilities;
- conditions and validity;
- material-change / re-review triggers.

The Master Legal Opinion remains `OPEN` until a qualified reviewer issues the attributable final artifact. Internal preparation, AI Office guidance, clinic correspondence or provider documents do not substitute for it.

## 10. Public-authority guidance boundary

Official European Commission / AI Office guidance is highly valuable and should be retained against the relevant workstream. It is `AUTHORITATIVE_GUIDANCE_SOURCE`, not automatically an independent counsel opinion or `LEGAL_8_OF_8` acceptance.

## 11. Current acceptance state

```text
FREE_COUNSEL_PACK=READY_FOR_BOUNDED_EXTERNAL_REVIEW
RISCK_COMPLY_OPERATOR_ENTITY=OWNER_DESIGNATED_REGISTRY_EVIDENCE_PENDING
RISCK_COMPLY_CONTRACTING_ENTITY=OPEN_OWNER_CONFIRMATION
LEGAL_8_OF_8=0/8_ACCEPTED
QUALIFIED_REVIEWS_ACCEPTED=0
MASTER_LEGAL_OPINION=OPEN
FINAL_PUBLICATION=BLOCKED
```

This pack is designed to minimise reviewer effort without pre-answering decisions reserved for qualified humans.
