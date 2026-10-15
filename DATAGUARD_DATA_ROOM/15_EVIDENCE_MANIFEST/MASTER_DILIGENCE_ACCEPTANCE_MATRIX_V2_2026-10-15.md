# Master Buyer Diligence Acceptance Matrix — V2

**Version:** V2 (2026-10-15)  
**Source baseline:** `main@8a759f883365c2c9652ff12e98099db77dd4c59d`  
**Maintainer:** RISCK COMPLY internal buyer-diligence controller  
**Classification:** INTERNAL — NO BUYER RELEASE  
**Status:** documentary source-level review; no runtime, legal or third-party acceptance implied.

Acceptance is a **documentary gate**; buyer acceptance and legal execution are different gates. Score 10 categories separately. Statuses `INTERNAL_VERIFIED`, `INTERNAL_PARTIAL`, `BUYER_HOLD` are document workflow states, **not** RUNTIME_PROVEN / EXTERNALLY_ASSURED / LEGAL_EXECUTED / BUYER_ACCEPTED.

| # | Required deliverable / canonical path | Internal document criterion and review result | Buyer release |
|---|---|---|---|
| 1 | Canonical index — `00_EXECUTIVE_INDEX/MASTER_BUYER_DATA_ROOM_INDEX.md` | INTERNAL_VERIFIED: frozen baseline and V2 cross-links identified | HOLD |
| 2 | Availability matrix — `00_EXECUTIVE_INDEX/BUYER_DOCUMENT_AVAILABILITY_MATRIX.md` | INTERNAL_VERIFIED: statuses, disclosure tiers and primary source paths identified | HOLD |
| 3 | Verified evidence manifest — `15_EVIDENCE_MANIFEST/CONSOLIDATED_EVIDENCE_MANIFEST.md`, plus V2 provenance register | INTERNAL_PARTIAL: sampled source/blob/link proof; not exhaustive all claims and repositories | HOLD |
| 4 | Provenance register — `15_EVIDENCE_MANIFEST/PROVENANCE_REGISTER_V2_2026-10-15.md` | INTERNAL_VERIFIED: frozen source SHA, date, scope, blobs for primary reviewed sources; ownership gaps explicitly separated | HOLD |
| 5 | Risks register — `11_KNOWN_RISKS_AND_GAPS/KNOWN_GAPS_REGISTER.md` | INTERNAL_VERIFIED: risk categories and newly known drift/open PR traced | HOLD |
| 6 | Disclosure classification — `09_LEGAL_PRIVACY/CONTROLLED_DISCLOSURE_POLICY.md` | INTERNAL_VERIFIED: four tiers and default restrictions exist; not a disclosure decision | HOLD |
| 7 | Master acceptance matrix — this document | INTERNAL_VERIFIED: per-deliverable gate, source and honest partials present | HOLD |
| 8 | Cross-executor handover — `15_EVIDENCE_MANIFEST/CROSS_EXECUTOR_HANDOVER_REGISTER_V2_2026-10-15.md` | INTERNAL_VERIFIED: technical/security/IP/runtime dependencies have explicit handoff owners and evidence status | HOLD |
| 9 | Controlled sharing pack — `00_EXECUTIVE_INDEX/BUYER_CONTROLLED_SHARING_PACK_V2_2026-10-15.md` | INTERNAL_PARTIAL: controlled selection drafted; no comprehensive PII/secrets/privilege redaction or buyer authorization recorded | HOLD |
| 10 | Closure report — `15_EVIDENCE_MANIFEST/FINAL_INTERNAL_CLOSURE_REPORT_V2_2026-10-15.md` | INTERNAL_VERIFIED: scope, denominator, gaps and next actions documented; final commit-based audit pending PR validation | HOLD |

**Internal verified = 8/10 = 80%** after this V2 branch is committed and checked; **remaining internal = 2/10 = 20%**: (3) full evidence breadth and (9) full approved-source confidentiality/redaction screen. These are conservative dossier-document checks, NOT product, software, procurement or legal readiness. If branch validation fails, recompute and do not claim 80%.

**Acquisition evidence current score = NOT_MEASURABLE.** Historical dated scoring only: 37/98 = 37.76% (2026-10-08); do not promote that score without new authenticated external or primary evidence.

Distinct factual state vocabulary:
- IMPLEMENTED: code/control is present; no runtime implication.
- TESTED: attributable test result, exact code SHA and environment.
- DEPLOYED: provider-linked deployment SHA and time.
- RUNTIME_PROVEN: accepted behavior evidence for an identified deployed SHA/environment.
- EXTERNALLY_ASSURED: attributable independent assessment covering precisely its accepted scope.
- LEGAL_EXECUTED: identifiable signed/effective agreement or official filing.
- BUYER_ACCEPTED: affirmative recorded acceptance from the authorized buyer.

**Acceptance blockers:** owner approval not recorded, disclosure pack not screened comprehensively, asset/title legal proof absent, terminal pentest not buyer accepted, current production parity unproven, external accounting/tax and provider/transaction consents outstanding.


## V5 controlled Stage A candidate — scoped internal acceptance addendum (2026-10-15)

The original V2 score of **8/10 = 80%** above is preserved as a historical checkpoint. A material internal gap has since been addressed without granting any external release:

- New [self-contained Stage A sanitized draft](../00_EXECUTIVE_INDEX/STAGE_A_CONTROLLED_BUYER_BRIEF_EN_2026-10-15.md), linked from the existing [sharing index](../00_EXECUTIVE_INDEX/BUYER_CONTROLLED_SHARING_PACK_V2_2026-10-15.md).
- Exact proposed-branch file blob at this review: `6e7ffd49be606ef5df17c0b3d4cc7b21cf6fb306`; six explicit source file references all present, zero missing Markdown links, zero observed email addresses and zero high-confidence credential patterns **within the new candidate**. Manual content review confirmed no named buyer contact, confidential correspondence, raw security report, token or personal record was introduced in the drafted brief.
- This passes **internal draft preparation only for initial controlled Stage A**. Detailed Stage B/C and independent legal/privacy certification are explicitly not part of this acceptance, and owner-specific release remains HOLD.

**Revised scoped internal deliverable accounting after proposed V5 documents are committed and checked:** `INTERNAL_VERIFIED=9/10=90%`; `INTERNAL_PARTIAL=1/10=10%` (item 3, exhaustive current evidence/claim-level reconciliation). Item 9 is `INTERNAL_VERIFIED_STAGE_A_ONLY`, not `EXTERNALLY_APPROVED` or `BUYER_ACCEPTED`.

`ACQUISITION_EVIDENCE=NOT_MEASURABLE` for an updated global calculation; preserve the dated `37.0/98=37.76%` (2026-10-08) only as history. `BUYER_RELEASE=HOLD`, `LEGAL_EXECUTED=NOT_CREDITED`, `BUYER_ACCEPTED=NOT_CREDITED`, `DEMO_STATUS=NOT_VERIFIED` by this document. Exact-head CI on this new PR remains an independent gate and must not be called PASS prematurely.


## V6 item 3 documentary-coverage closeout — scoped evidence, conditional CI

The historical V2 and V5 scores above remain snapshots. In this V6 working branch, the sole internally partial category (#3, **verified evidence manifest/source reconciliation**) is now **PREPARED_FOR_VERIFICATION** with:

- **80/80 current Markdown source identities** (31 canonical room + 49 technical/M&A support docs in exactly five named directories) pinned by immutable Git tree SHA/blob in the existing provenance register. The whole repository includes more files and is not claimed comprehensively accepted.
- **16/16 DataGuard evidence sections** assigned bounded claim and outstanding proof classes. These are explicit eligibility/qualification records, not blind PASSes.
- **12/12 material Stage A initial buyer claims** crosswalked to primary internal source documents or dated provider records in the V5 section of provenance. Legal, financial, title, provider and independent runtime/assurance unknowns remain OPEN.
- Existing V4 offline audit **SUCCESS, 10/10 tests**, at its **separately identified** GitHub PR checkout; V6 adds a dedicated fail-closed test/check for all frozen source paths, sections and Stage A source references. V6 code/files must pass their **own exact PR checkout** before internal item 3 is credited as VERIFIED.
- The Stage A sanitized draft is internal-only. No Stage B/C disclosure authorization, legal data-minimization signoff, buyer acceptance or terminal third-party assurance is inferred.

**Scoped accounting at this working-branch checkpoint:**
- `INTERNAL_DOCUMENTARY_PREPARED=10/10=100%` (all ten defined deliverables have a completed reviewable source artifact).
- `INTERNAL_DOCUMENTARY_VERIFIED=9/10=90%` **until** V6 source-inventory+claim tests and offline screen pass at the actual checked PR SHA.
- `REMAINING_INTERNAL_VERIFICATION=1/10=10%` (the final CI-verified item 3).
- After accepted V6 exact-head green execution, item 3 may be marked `INTERNAL_VERIFIED_SOURCE_SCOPE` and the **ten-document internal denominator becomes 10/10=100%**, without any automatic buyer-release status change.
- `ACQUISITION_EVIDENCE=NOT_MEASURABLE` for a newly recomputed global score; the older 37/98 = 37.76% remains dated 2026-10-08 only.
- `BUYER_RELEASE=HOLD`; `EXTERNAL_ASSURANCE=OPEN`; `LEGAL_EXECUTED=NOT_CREDITED`; `BUYER_ACCEPTED=0/10` under the original recorded approval matrix.

Any data-room/source additions or changes after the V6 source snapshot must be reconciled before relying on its frozen 80/80 count. A clean offline scan does **not** certify privilege, personal-data completeness or external confidentiality.
