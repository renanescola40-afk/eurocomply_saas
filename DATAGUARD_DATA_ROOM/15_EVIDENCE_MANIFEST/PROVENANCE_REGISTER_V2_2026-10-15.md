# Verified Evidence Manifest and Document Provenance Register — V2

**Version:** V2 (2026-10-15)  
**Source baseline:** `main@8a759f883365c2c9652ff12e98099db77dd4c59d`  
**Maintainer:** RISCK COMPLY internal buyer-diligence controller  
**Classification:** INTERNAL — NO BUYER RELEASE  
**Status:** documentary source-level review; no runtime, legal or third-party acceptance implied.

## Evidence provenance — directly inspected in the frozen baseline
The blob hashes below are **Git content identity**, not certification, legal proof or a hash of an external report. Source changes after the baseline require a new check.

| ID | Repository path (relative to root) | Blob SHA | Provenance / validation | Disclosure |
|---|---|---|---|---|
| P01 | `DATAGUARD_DATA_ROOM/00_EXECUTIVE_INDEX/MASTER_BUYER_DATA_ROOM_INDEX.md` | `0039be34bfe7d32400532968dd51ed15af27b9ed` | Readable canonical V1 index; updated by this V2 branch, original blob retained for traceability | INTERNAL |
| P02 | `DATAGUARD_DATA_ROOM/00_EXECUTIVE_INDEX/BUYER_DOCUMENT_AVAILABILITY_MATRIX.md` | `50d3b533cc46691033ef91ab61c44d8eb1dbecf3` | Readable pre-V2 availability table; V2 adds status cross-reference | INTERNAL |
| P03 | `DATAGUARD_DATA_ROOM/15_EVIDENCE_MANIFEST/CONSOLIDATED_EVIDENCE_MANIFEST.md` | `d94ea45bdb4e5bddbabb4b4e59cdbf5b3e18311b` | Historical selected source register; not exhaustive | INTERNAL |
| P04 | `DATAGUARD_DATA_ROOM/11_KNOWN_RISKS_AND_GAPS/KNOWN_GAPS_REGISTER.md` | `61ba39af840ced6250a6025153f683d9d340c4de` | Historical ten risk clusters; V2 adds later evidence | INTERNAL |
| P05 | `DATAGUARD_DATA_ROOM/09_LEGAL_PRIVACY/CONTROLLED_DISCLOSURE_POLICY.md` | `cd88bc03f61455401a5f6e528cd4a0c95a5d289a` | Four-tier disclosure control; owner approval HOLD | INTERNAL |
| P06 | `DATAGUARD_DATA_ROOM/15_EVIDENCE_MANIFEST/ACCEPTANCE_GATES_AND_SCORING.md` | `026a56ee1f70f541a99463e8a6e78cbbfa1fb218` | 10 original document categories; 0/10 disclosure approvals credited | INTERNAL |
| P07 | `docs/ma-diligence/M_AND_A_REQUIREMENT_STATUS_MATRIX.md` | `5e475c97762b826b6c7e16469c16d9b9b108aef4` | 2026-10-08 historical 37/98 score only | RESTRICTED_LATE_STAGE |
| P08 | `docs/ma-diligence/RISCK_COMPLY_MA_IP_ASSET_PERIMETER_V3_GATES_2026-10-14.md` | `605fe74ca0789240c685d00c443b589816778cfb` | IP manifest tool draft; actual per-file manifest not executed; title open | NDA_REQUIRED |
| P09 | `docs/due-diligence/VALIDATION_AND_BUYER_ACCEPTANCE_V2.md` | `c8104d509b5d11f8820e936245297fdc129cdeef` | Technical 0/12 independently complete at dated review; test matrix NOT RUN | RESTRICTED_LATE_STAGE |
| P10 | `docs/assurance/iso27001-soc2/exact-sha-production-drift-2026-10-15.md` | `25a3867221391a04e86397df5ff2c66e442eaa10` | Dated snapshot reports deploy `857ddfb21d0135df3a026ad480da5945119b175c` versus then-main +108 commits; NOT a current deployment assertion | RESTRICTED_LATE_STAGE |
| P11 | `docs/assurance/iso27001-soc2/ci-recovery-success-2026-10-15.md` | `faaae45e4246a82dee612adbe641f391e977593a` | Successful CI checks at `11f233a3a7981065c262d14a1d104ea6f7b4829b`; not production equivalence | NDA_REQUIRED |
| P12 | `docs/security/supabase-closure-2026-10-15-phase2-acl.md` | `f3efacebd104cf352bc6ebeec3f01bccf19ba885` | RLS metadata direct grants check; database-security gate explicitly NO_PASS | RESTRICTED_LATE_STAGE |

## Repository scope and verification performed
- Checked frozen Git tree: **5,540 entries**, including **4,915 tracked blobs**, with API response `truncated=false`. This proves *tree enumeration* only, not functional or ownership completeness.
- Inspected all **24 Markdown files** within `DATAGUARD_DATA_ROOM/` at this SHA. Extracted **six relative Markdown links**, all six targets present in the frozen tree (6/6). Not a full plain-text path, anchor, image, URL, external-site, secret or PII audit.
- Canonical room folders **16/16 present**. File existence does not equal approval or verification of claims.
- PRs #2452, #2457, #2458, #2459 and #2461 found merged; earlier V1 source is preserved as historical.
- PR #2477 was OPEN at the inspection timestamp; never imply its proposed security changes were deployed or merged.

## Chain of custody and limits
Source authority: GitHub API read-only tree, file contents and PR metadata for exact baseline above; recorded by autonomous reviewer on 2026-10-15. These records alone do not establish legal author, creator-to-seller assignment, provider account owner, notarized document authenticity, or buyer acceptance. V2 additions and edits are versioned by the eventual **isolated-branch commit SHA** (shown on the PR/branch), not self-certified by a SHA embedded in their own content. Independently verify each file's blob SHA and source history before disclosure.

**Validation outcome:** PASS for scoped existence and relative-link targets; PARTIAL for completeness, provenance outside Git and confidentiality screening. Owner disclosure HOLD applies.


## V5 controlled Stage A claim-to-source traceability (2026-10-15)

**Scope:** The 12 material assertion categories in the new `STAGE_A_CONTROLLED_BUYER_BRIEF_EN_2026-10-15.md` are mapped below. This is **documentary completeness for Stage A claims**, not all 4,926 repository file contents, release execution, official financial statements, independent security assurance or buyer approval. Original source blobs were read from the proposed V5 branch, based on `main@bae682c11093169bdf37da44a39aa4f031927bde`. V5's final commit identity is obtained from the branch/PR, not recursively stored inside this document.

| Claim / boundary | Attributable source and Git blob SHA (first 12 chars) | Evidence semantics | Disclosure |
|---|---|---|---|
| 01. AI governance / EU AI Act product purpose | `docs/sales/one-pager.md` — `643e1e8c6a7c`; `docs/ma/buyer-materials/RISCK_COMPLY_CORPORATE_ACQUISITION_OVERVIEW.md` — `963bec8050c7` | DOCUMENTED_PRODUCT_SCOPE; no independently verified customer outcome | INITIAL_REVIEW |
| 02. AI system inventory / assignment and classification workflows | `docs/ma/buyer-materials/RISCK_COMPLY_CORPORATE_ACQUISITION_OVERVIEW.md` — `963bec8050c7` | IMPLEMENTED_DESCRIBED; current runtime journeys not separately TESTED here | INITIAL_REVIEW |
| 03. Governance documents, evidence, audit and procurement use cases | `docs/sales/one-pager.md` — `643e1e8c6a7c` | DOCUMENTED; no present-day production artifact acceptance implied | INITIAL_REVIEW |
| 04. Next.js/TypeScript, Supabase and Stripe architectural shape | `docs/trust/ARCHITECTURE_OVERVIEW.md` — `163e340379ca` | IMPLEMENTED_SOURCE_ARCHITECTURE; deployment parity not inferred | INITIAL_REVIEW (sanitized only) |
| 05. Tenant isolation/RLS and direct privilege metadata | `docs/security/supabase-closure-2026-10-15-phase2-acl.md` — `f3efacebd104` | DATED_METADATA_CLAIM; full tenant-isolation RUNTIME_PROVEN=NOT_VERIFIED | NDA_REQUIRED |
| 06. Security assurance and certifications | `docs/security/dataguard/EXTERNAL_ASSURANCE_RECONCILIATION_V1_4.md` — `eea292a50aae` | Historical independent limited assessment documented; terminal EXTERNALLY_ASSURED=OPEN; ISO/SOC certifications NOT_CLAIMED | NDA_REQUIRED |
| 07. Pre-commercial positioning; financial truth limits | `docs/ma-diligence/M_AND_A_REQUIREMENT_STATUS_MATRIX.md` — `a6a2fbff5503` | 37/98=37.76% is HISTORICAL 2026-10-08 score; company-wide revenue/legal books remain UNVERIFIED | INITIAL_REVIEW qualified; originals NDA_REQUIRED |
| 08. Agreed asset perimeter / seller IP ownership | `docs/ma/buyer-materials/RISCK_COMPLY_TRANSACTION_PERIMETER.md` — `baa856013738` | PARTIAL_TITLE; LEGAL_EXECUTED creator-to-seller transfer NOT_CREDITED | INITIAL_REVIEW boundary; original title NDA_REQUIRED |
| 09. Provider transferability and operational handover | `docs/ma-diligence/PROVIDER_TRANSFER_MATRIX.md` — `99bbd469d5f5` | PROVIDER_SPECIFIC; no blanket transfer or buyer acceptance | NDA_REQUIRED |
| 10. Current repository visibility / historical exposure | Authenticated GitHub repository metadata observed on 2026-10-15 returned `visibility=private`; `docs/ma/buyer-materials/RISCK_COMPLY_DILIGENCE_TRUTH_PACK.md` — `997490820a0e` | CURRENT_PRIVATE_VERIFIED; history/forks/caches purge NOT_VERIFIED | NDA_REQUIRED |
| 11. Production SHA and CI boundary | Vercel deployment `dpl_G46QK2En1purZiDjnDMamBjcWrEB` (dated 2026-10-15) / deployed Git SHA `3310757dc82c2f5b07a5763b2e4b6e9fc5b4bfc5`; GitHub Actions offline dossier job #116658993572 | DEPLOYED identity evidenced at checkpoint; current RUNTIME_PROVEN not claimed. Offline dossier tests 5/5 TESTED on workflow's checked-out SHA, not a production proof. | RESTRICTED |
| 12. Initial buyer delivery is a controlled draft, not buyer acceptance | `DATAGUARD_DATA_ROOM/00_EXECUTIVE_INDEX/BUYER_CONTROLLED_SHARING_PACK_V2_2026-10-15.md` — `2f56bf720395`; Stage A brief — `6e7ffd49be60` | INTERNALLY_DRAFTED_AND_SOURCE_SCREENED; BUYER_ACCEPTED=NO; owner release HOLD | INTERNAL / HOLD |

**Claim mapping coverage: 12/12 categories mapped to identified documentary or dated provider evidence, with material unknowns explicitly labeled.** This measures references, *not* the number of substantive requirements satisfied or cleared. 12/12 has no acquisition-evidence score impact. It is not sufficient by itself to mark the separate ten-document global internal gate as 100%; exhaustive broader source/claim and confidential-material controls remain separately tracked.

If any source blob changes, reopen the applicable row and re-review. Detailed privileged legal/accounting records, security findings, or private buyer correspondence must be referenced by access-controlled identifiers rather than duplicated here. Never assert certification, owner signature, clean pentest, complete revenue verification, production parity or buyer acceptance from this table.

## V6 exhaustive source-identity baseline — 2026-10-15

**Immutable reference:** GitHub `main@57f74e107dc2c51cfb0219f5e5dcdc44064c6907`, `tree.truncated=false`. This ledger includes **all Markdown files** in the five explicitly enumerated DataGuard and adjacent M&A/technical-support directories at that exact revision. It captures each **Git blob object ID**, not a signature that all statements inside the file are true. All paths were enumerated directly from the untruncated Git tree (all repository blobs: 4929); the eligible document denominator here is **80**, not the complete codebase.

**Explicit inventory:** DATAGUARD_DATA_ROOM/ = 31; docs/due-diligence/ = 5; docs/ma-diligence/ = 31; docs/ma/buyer-materials/ = 8; docs/security/dataguard/ = 5. The Git object hashes below are frozen to the **pre-V6 main source**; changes in this branch necessarily alter a subset of hashes, and do not retroactively alter this historical baseline. Do not confuse this tree enumeration with comprehensive binary/media/privacy review.

| # | Scoped Markdown source (exact path) | Frozen blob SHA-1 | Attestation |
|---:|---|---|---|
| 1 | `DATAGUARD_DATA_ROOM/00_EXECUTIVE_INDEX/BUYER_CONTROLLED_SHARING_PACK_V2_2026-10-15.md` | `2f56bf720395a56882abdbf485991b7971e60809` | TRACKED_IN_UNTRUNCATED_TREE |
| 2 | `DATAGUARD_DATA_ROOM/00_EXECUTIVE_INDEX/BUYER_DOCUMENT_AVAILABILITY_MATRIX.md` | `5f0945bb863ca6088da1d6a9089481e643c6e8c8` | TRACKED_IN_UNTRUNCATED_TREE |
| 3 | `DATAGUARD_DATA_ROOM/00_EXECUTIVE_INDEX/MASTER_BUYER_DATA_ROOM_INDEX.md` | `57154c82f76a769707e4c19a7f56f84a3b1bf954` | TRACKED_IN_UNTRUNCATED_TREE |
| 4 | `DATAGUARD_DATA_ROOM/00_EXECUTIVE_INDEX/OWNER_RELEASE_DECISION.md` | `bd88f87793d4261c12791190a2e44f7691a685da` | TRACKED_IN_UNTRUNCATED_TREE |
| 5 | `DATAGUARD_DATA_ROOM/00_EXECUTIVE_INDEX/STAGE_A_CONTROLLED_BUYER_BRIEF_EN_2026-10-15.md` | `6e7ffd49be606ef5df17c0b3d4cc7b21cf6fb306` | TRACKED_IN_UNTRUNCATED_TREE |
| 6 | `DATAGUARD_DATA_ROOM/01_PRODUCT/EXECUTIVE_PRODUCT_TECH_OVERVIEW.md` | `93fb9f5a8ac351456c79a23dea6f6ca91228b679` | TRACKED_IN_UNTRUNCATED_TREE |
| 7 | `DATAGUARD_DATA_ROOM/02_ARCHITECTURE/ARCHITECTURE_EVIDENCE_INDEX.md` | `ffd9630c2f7fa39b7382c0d90868a6d5c38e5d31` | TRACKED_IN_UNTRUNCATED_TREE |
| 8 | `DATAGUARD_DATA_ROOM/03_SECURITY/SECURITY_ASSURANCE_DISCLOSURE.md` | `0133a97459c082a72ad505e2ff56a615ba24542f` | TRACKED_IN_UNTRUNCATED_TREE |
| 9 | `DATAGUARD_DATA_ROOM/04_DATABASE_RLS/DATABASE_TENANT_ISOLATION_INDEX.md` | `5ead82bb4365eece630a4ca2985a31d07de70d9c` | TRACKED_IN_UNTRUNCATED_TREE |
| 10 | `DATAGUARD_DATA_ROOM/05_APIS_INTEGRATIONS/APIS_PROVIDER_EVIDENCE_INDEX.md` | `d1e049983f624a784ef91d428ae36d991c3eb452` | TRACKED_IN_UNTRUNCATED_TREE |
| 11 | `DATAGUARD_DATA_ROOM/06_BILLING/BILLING_EVIDENCE_INDEX.md` | `68d75f231b4df7f53f3268e72cc841ca47409072` | TRACKED_IN_UNTRUNCATED_TREE |
| 12 | `DATAGUARD_DATA_ROOM/07_DEVOPS_RELEASE/DEVOPS_RELEASE_EVIDENCE_INDEX.md` | `1feceeec9761ed7c62a4af1df43a0bd263383418` | TRACKED_IN_UNTRUNCATED_TREE |
| 13 | `DATAGUARD_DATA_ROOM/08_IP_ASSETS/TRANSACTION_PERIMETER.md` | `99e653cbd62040e97c242971835b20d68071345a` | TRACKED_IN_UNTRUNCATED_TREE |
| 14 | `DATAGUARD_DATA_ROOM/09_LEGAL_PRIVACY/CONTROLLED_DISCLOSURE_POLICY.md` | `cd88bc03f61455401a5f6e528cd4a0c95a5d289a` | TRACKED_IN_UNTRUNCATED_TREE |
| 15 | `DATAGUARD_DATA_ROOM/10_RUNTIME_EVIDENCE/RUNTIME_EVIDENCE_REQUEST.md` | `edd095688a3c684c7f0dada49ef58dd307eff89f` | TRACKED_IN_UNTRUNCATED_TREE |
| 16 | `DATAGUARD_DATA_ROOM/11_KNOWN_RISKS_AND_GAPS/KNOWN_GAPS_REGISTER.md` | `0a77b2e64483fb86152586770b48c85cd8c02881` | TRACKED_IN_UNTRUNCATED_TREE |
| 17 | `DATAGUARD_DATA_ROOM/11_KNOWN_RISKS_AND_GAPS/OUTSTANDING_DILIGENCE_REQUEST_LIST.md` | `ac838d83366883a7c90b694c90191fe82b29e89e` | TRACKED_IN_UNTRUNCATED_TREE |
| 18 | `DATAGUARD_DATA_ROOM/12_TRANSACTION_PERIMETER/MASTER_DUE_DILIGENCE_STATUS.md` | `cf2d4f13380b225bb874e851329401ad80588014` | TRACKED_IN_UNTRUNCATED_TREE |
| 19 | `DATAGUARD_DATA_ROOM/13_HANDOVER_PLAN/TECHNICAL_HANDOVER_INDEX.md` | `75c01ad427774946ec41bd7dc309b5665ec31672` | TRACKED_IN_UNTRUNCATED_TREE |
| 20 | `DATAGUARD_DATA_ROOM/14_BUYER_QA/BUYER_QA.md` | `03af50b89eacac45f00aba6d81c90cf0267185fe` | TRACKED_IN_UNTRUNCATED_TREE |
| 21 | `DATAGUARD_DATA_ROOM/15_EVIDENCE_MANIFEST/ACCEPTANCE_GATES_AND_SCORING.md` | `65f9a335b22f1a03438991dfe3a278cf7f60b424` | TRACKED_IN_UNTRUNCATED_TREE |
| 22 | `DATAGUARD_DATA_ROOM/15_EVIDENCE_MANIFEST/CONSOLIDATED_EVIDENCE_MANIFEST.md` | `631e676dd311ab3bba9d58d6dcf98a20af327bfd` | TRACKED_IN_UNTRUNCATED_TREE |
| 23 | `DATAGUARD_DATA_ROOM/15_EVIDENCE_MANIFEST/CROSS_EXECUTOR_HANDOVER_REGISTER_V2_2026-10-15.md` | `f46f5088a17943939574a02fe6a818838eca5cd7` | TRACKED_IN_UNTRUNCATED_TREE |
| 24 | `DATAGUARD_DATA_ROOM/15_EVIDENCE_MANIFEST/CROSS_EXECUTOR_RECONCILIATION.md` | `0ef7041ea80959723b7348311a035dd3dd434af0` | TRACKED_IN_UNTRUNCATED_TREE |
| 25 | `DATAGUARD_DATA_ROOM/15_EVIDENCE_MANIFEST/EVIDENCE_TO_CLOSE_CHECKLIST_V4_2026-10-14.md` | `7636fb470b43b83fa98aba248b4540ef0039b1db` | TRACKED_IN_UNTRUNCATED_TREE |
| 26 | `DATAGUARD_DATA_ROOM/15_EVIDENCE_MANIFEST/FINAL_INTERNAL_CLOSURE_REPORT_V2_2026-10-15.md` | `043a8ae991cdb7c7a9bf707d56331ca0fd753107` | TRACKED_IN_UNTRUNCATED_TREE |
| 27 | `DATAGUARD_DATA_ROOM/15_EVIDENCE_MANIFEST/FROZEN_BASELINE_LINK_VALIDATION_V2_2026-10-15.md` | `2b05d40eb98d2761113ee8a425579ad22dbbdb43` | TRACKED_IN_UNTRUNCATED_TREE |
| 28 | `DATAGUARD_DATA_ROOM/15_EVIDENCE_MANIFEST/MASTER_DILIGENCE_ACCEPTANCE_MATRIX_V2_2026-10-15.md` | `e10042a99eea4537d6d98a747f9459f082e00c47` | TRACKED_IN_UNTRUNCATED_TREE |
| 29 | `DATAGUARD_DATA_ROOM/15_EVIDENCE_MANIFEST/PROVENANCE_REGISTER_V2_2026-10-15.md` | `82bd296f1fb8570ebeab54787c882e8ef0062f93` | TRACKED_IN_UNTRUNCATED_TREE |
| 30 | `DATAGUARD_DATA_ROOM/15_EVIDENCE_MANIFEST/VALIDATION_2026-10-14.md` | `ab2227f86fd3c0ff15c9304b40ab7731002c32b5` | TRACKED_IN_UNTRUNCATED_TREE |
| 31 | `DATAGUARD_DATA_ROOM/15_EVIDENCE_MANIFEST/VALIDATION_CHECKPOINT_V2_2026-10-14.md` | `a74a331188fc0e87305de8a21faeae6529dc4c9b` | TRACKED_IN_UNTRUNCATED_TREE |
| 32 | `docs/due-diligence/BUYER_HANDOVER_AND_EVIDENCE_CLOSURE_V3.md` | `acb117194b196fd0f9511378f0f87a15f8a8bd74` | TRACKED_IN_UNTRUNCATED_TREE |
| 33 | `docs/due-diligence/ENGINEERING_ARCHITECTURE_AND_BOUNDARIES_V1.md` | `1c47067da6906ed1a27add15c37f63a5e8ea85b1` | TRACKED_IN_UNTRUNCATED_TREE |
| 34 | `docs/due-diligence/ROUTES_DEPENDENCIES_DISCOVERY_V1.md` | `251f39fec969a85380e03276a10d3c70a60622c8` | TRACKED_IN_UNTRUNCATED_TREE |
| 35 | `docs/due-diligence/TECHNICAL_DUE_DILIGENCE_EVIDENCE_REGISTER_V1.md` | `003373f12f8412a72a8196b831d0ad9224d26e57` | TRACKED_IN_UNTRUNCATED_TREE |
| 36 | `docs/due-diligence/VALIDATION_AND_BUYER_ACCEPTANCE_V2.md` | `c8104d509b5d11f8820e936245297fdc129cdeef` | TRACKED_IN_UNTRUNCATED_TREE |
| 37 | `docs/ma-diligence/ADDRESSABLE_MARKET_CLAIMS_SUBSTANTIATION_2026-10-06.md` | `e28349f4c6cfcb3e11b7d5b6dc159961e59003ce` | TRACKED_IN_UNTRUNCATED_TREE |
| 38 | `docs/ma-diligence/ASSET_TITLE_REGISTER.md` | `69c462ae33f261972914516444be2908b60fbb96` | TRACKED_IN_UNTRUNCATED_TREE |
| 39 | `docs/ma-diligence/COMMERCIAL_PIPELINE_EVIDENCE_REGISTER.md` | `327e2c0fdfea5f563a75174516a9ca0c41da84f6` | TRACKED_IN_UNTRUNCATED_TREE |
| 40 | `docs/ma-diligence/CONTRIBUTOR_AND_ACCOUNT_EVIDENCE_REGISTER.md` | `6623b540ccb841dd02861955ac7541b3dd25e6f7` | TRACKED_IN_UNTRUNCATED_TREE |
| 41 | `docs/ma-diligence/CORPORATE_DILIGENCE_INDEX.md` | `9478839f4eb12f9ddbb8627eca82fc05a53d69bb` | TRACKED_IN_UNTRUNCATED_TREE |
| 42 | `docs/ma-diligence/CORPORATE_IP_TITLE_FINAL_CLOSURE_MATRIX.md` | `14b63457c0993e4ea08d11dc5e7e72908d61541d` | TRACKED_IN_UNTRUNCATED_TREE |
| 43 | `docs/ma-diligence/CREATOR_CONTRIBUTOR_REGISTER.md` | `eb25f8b55a5f1f1ceed5b04936436a643eddbfbb` | TRACKED_IN_UNTRUNCATED_TREE |
| 44 | `docs/ma-diligence/FINANCIAL_FACT_BOOK.md` | `02359c3b0c629d2e4bb8bb835f7b2b0aad4a5b5c` | TRACKED_IN_UNTRUNCATED_TREE |
| 45 | `docs/ma-diligence/FINANCIAL_TAX_FINAL_CLOSURE_MATRIX.md` | `46922f3ded980b8081706c130d2263f3eaa13b51` | TRACKED_IN_UNTRUNCATED_TREE |
| 46 | `docs/ma-diligence/FORECAST_AND_UNIT_ECONOMICS_FRAMEWORK.md` | `8d0276a92af80179c05da389fb3e2def09b3b0a4` | TRACKED_IN_UNTRUNCATED_TREE |
| 47 | `docs/ma-diligence/IP_CHAIN_OF_TITLE_EVIDENCE_PACK.md` | `cd448d43a022dafe165d96a1fa0ff4214d8cde3c` | TRACKED_IN_UNTRUNCATED_TREE |
| 48 | `docs/ma-diligence/IP_ENCUMBRANCE_REGISTER.md` | `851e6249ea35af81c2c39b74de0946fe71dd799f` | TRACKED_IN_UNTRUNCATED_TREE |
| 49 | `docs/ma-diligence/IP_OWNERSHIP_MASTER.md` | `ee6e08f1ca69a83563218296dc56fa4ed22b71a0` | TRACKED_IN_UNTRUNCATED_TREE |
| 50 | `docs/ma-diligence/M_AND_A_REQUIREMENT_STATUS_MATRIX.md` | `a6a2fbff55039bd8ba2c87e2d20796eab3d9d0da` | TRACKED_IN_UNTRUNCATED_TREE |
| 51 | `docs/ma-diligence/MANAGEMENT_ACCOUNTS_TRANSACTION_TEMPLATE.md` | `a35d619de950e42fc1a06e85555fd54807665594` | TRACKED_IN_UNTRUNCATED_TREE |
| 52 | `docs/ma-diligence/OFFICIAL_DOCUMENT_REQUEST_LIST.md` | `6ae7561811ade077e5b2b0dc34e4154c6dc7cb1a` | TRACKED_IN_UNTRUNCATED_TREE |
| 53 | `docs/ma-diligence/OWNER_DOCUMENT_REQUEST_PACK.md` | `b636cee84b371f145181a11f67b938c1c0ad85c1` | TRACKED_IN_UNTRUNCATED_TREE |
| 54 | `docs/ma-diligence/PROVIDER_TRANSFER_CHANGE_OF_CONTROL_REVIEW_2026-10-05.md` | `4ed0db4791e18809cf2ae2822f2834f66cb27ce2` | TRACKED_IN_UNTRUNCATED_TREE |
| 55 | `docs/ma-diligence/PROVIDER_TRANSFER_MATRIX.md` | `99bbd469d5f587259f110f55f88c1bbf262838ab` | TRACKED_IN_UNTRUNCATED_TREE |
| 56 | `docs/ma-diligence/RISCK_COMPLY_MA_IP_ASSET_PERIMETER_V1_2026-10-14.md` | `47314bf6dccf0a080a6ee9bb165044996a979564` | TRACKED_IN_UNTRUNCATED_TREE |
| 57 | `docs/ma-diligence/RISCK_COMPLY_MA_IP_ASSET_PERIMETER_V2_RECONCILIATION.md` | `b6cb1aed0408ab2d51ec6580d0d17b297cd7a8cb` | TRACKED_IN_UNTRUNCATED_TREE |
| 58 | `docs/ma-diligence/RISCK_COMPLY_MA_IP_ASSET_PERIMETER_V3_GATES_2026-10-14.md` | `605fe74ca0789240c685d00c443b589816778cfb` | TRACKED_IN_UNTRUNCATED_TREE |
| 59 | `docs/ma-diligence/SELLER_DATA_ROOM_MASTER_SCORECARD.md` | `28a0b29b642eddb7c2f98368278e661895432849` | TRACKED_IN_UNTRUNCATED_TREE |
| 60 | `docs/ma-diligence/SELLER_FINANCIAL_SUMMARY.md` | `6d54faa8c992f70e86d0b54245962e4ff5aba92a` | TRACKED_IN_UNTRUNCATED_TREE |
| 61 | `docs/ma-diligence/STRIPE_LIVE_ACCOUNT_RECONCILIATION_2026-10-06.md` | `16a586d28899f062e30efaabb2cd1da3a41e0614` | TRACKED_IN_UNTRUNCATED_TREE |
| 62 | `docs/ma-diligence/STRIPE_LIVE_FINANCIAL_EVIDENCE_REGISTER.md` | `3d8906027cf58c4fe680c30f8696011739aa811c` | TRACKED_IN_UNTRUNCATED_TREE |
| 63 | `docs/ma-diligence/TAX_DILIGENCE_CHECKLIST.md` | `d9ea83f25c33ebcce51bbb26669bd075a472b350` | TRACKED_IN_UNTRUNCATED_TREE |
| 64 | `docs/ma-diligence/TAX_DILIGENCE_FINAL_MATRIX.md` | `4c20623613ffea35eaed20074f756a9ac542f29f` | TRACKED_IN_UNTRUNCATED_TREE |
| 65 | `docs/ma-diligence/TAX_DOCUMENT_REQUEST_PACK.md` | `25580a3515639444ddb421c307b41db25e36baca` | TRACKED_IN_UNTRUNCATED_TREE |
| 66 | `docs/ma-diligence/TRANSACTION_DECISION_MATRIX.md` | `1387dc34550830cf8cd102fd9afa4843199033b2` | TRACKED_IN_UNTRUNCATED_TREE |
| 67 | `docs/ma-diligence/TRANSACTION_TAX_QUESTIONS_BY_BUYER_JURISDICTION.md` | `ca52f16f7e6aeeaeb2158da63aeb66dcfcb33e36` | TRACKED_IN_UNTRUNCATED_TREE |
| 68 | `docs/ma/buyer-materials/RISCK_COMPLY_BUYER_MA_QA.md` | `959d2ad1fc5d9c956ee355451217811aebedd9de` | TRACKED_IN_UNTRUNCATED_TREE |
| 69 | `docs/ma/buyer-materials/RISCK_COMPLY_BUYER_SPECIFIC_RESPONSE_PACKS.md` | `5f63e8cf55c061430a55a5f23590d10a7997dc72` | TRACKED_IN_UNTRUNCATED_TREE |
| 70 | `docs/ma/buyer-materials/RISCK_COMPLY_CORPORATE_ACQUISITION_OVERVIEW.md` | `963bec8050c72de1b7d23f08e39e9cb6666bcc76` | TRACKED_IN_UNTRUNCATED_TREE |
| 71 | `docs/ma/buyer-materials/RISCK_COMPLY_DILIGENCE_TRUTH_PACK.md` | `997490820a0e7b3fb3e15394bead359e38bdce52` | TRACKED_IN_UNTRUNCATED_TREE |
| 72 | `docs/ma/buyer-materials/RISCK_COMPLY_FINANCIAL_COMMERCIAL_FACTSHEET.md` | `28e0cb9e2be18b02afde0d043e9069deb98df561` | TRACKED_IN_UNTRUNCATED_TREE |
| 73 | `docs/ma/buyer-materials/RISCK_COMPLY_PRODUCT_USE_CASES.md` | `6079bf7fccad10c45883d2d610e46f542acae7d7` | TRACKED_IN_UNTRUNCATED_TREE |
| 74 | `docs/ma/buyer-materials/RISCK_COMPLY_TEAM_AND_CREATOR_BRIEF.md` | `1a1909fe4a92d120eb9ef0128795f4754388806f` | TRACKED_IN_UNTRUNCATED_TREE |
| 75 | `docs/ma/buyer-materials/RISCK_COMPLY_TRANSACTION_PERIMETER.md` | `baa85601373848db83c9a6b7e9bcd5555289837b` | TRACKED_IN_UNTRUNCATED_TREE |
| 76 | `docs/security/dataguard/AUTHORIZATION_CALL_PATH_REVIEW_V1_2.md` | `157c2ff817410dde93401fe8068d8c784e8d2c38` | TRACKED_IN_UNTRUNCATED_TREE |
| 77 | `docs/security/dataguard/ENTERPRISE_SECURITY_EVIDENCE_V1.md` | `4b4fd50de843fa8d569d577dbc88acd23cdc1aa4` | TRACKED_IN_UNTRUNCATED_TREE |
| 78 | `docs/security/dataguard/EXTERNAL_ASSURANCE_RECONCILIATION_V1_4.md` | `eea292a50aaefc6b2db7ecd2c7336f5ef30afa16` | TRACKED_IN_UNTRUNCATED_TREE |
| 79 | `docs/security/dataguard/SECURITY_EVIDENCE_V1_3.md` | `333755d7e9b853cfb0d7b328f11239aa853a94d8` | TRACKED_IN_UNTRUNCATED_TREE |
| 80 | `docs/security/dataguard/SECURITY_STATIC_REVIEW_ADDENDUM_V1_1.md` | `eceedbbc5632611d4390ce8cdb7f0855b0dea4ac` | TRACKED_IN_UNTRUNCATED_TREE |

### 16 section-level claim/accountability classifications

Each class identifies the *type of claim* and whether a buyer may rely on it; it does not automatically mark a specific production/security/legal requirement PASS.

| Section | Principal claim or artifact | Evidence class / unresolved boundary |
|---|---|---|
| `00_EXECUTIVE_INDEX` | Internal routing, document versions and release control | SOURCE_DOCUMENTED; release HOLD |
| `01_PRODUCT` | Product positioning and implementation scope | DOCUMENTED; production acceptance unverified |
| `02_ARCHITECTURE` | Architecture descriptions and repository pointers | DOCUMENTED; deployment-specific runtime unverified |
| `03_SECURITY` | Security description, assessor scope and assurance boundary | INTERNAL_SOURCE; terminal independent retest OPEN |
| `04_DATABASE_RLS` | RLS/tenant-isolation design and evidence pointers | PARTIAL; strict runtime tenant PASS unverified |
| `05_APIS_INTEGRATIONS` | API/provider dependencies and handover rights | PARTIAL; provider transfer OPEN |
| `06_BILLING` | Stripe and commercial evidence scoped to source/provider | PARTIAL; accountant/company-wide revenue OPEN |
| `07_DEVOPS_RELEASE` | Source, CI, release and deployment identity | PARTIAL; production source parity OPEN |
| `08_IP_ASSETS` | Asset ownership, OSS/licensing and chain of title | PARTIAL; signed creator-to-seller title OPEN |
| `09_LEGAL_PRIVACY` | Disclosure, privacy, contractual and statutory materials | PARTIAL; executed legal documents OPEN |
| `10_RUNTIME_EVIDENCE` | Requested environment-bound acceptance proofs | REQUESTED; all-current runtime PASS unverified |
| `11_KNOWN_RISKS_AND_GAPS` | Risks and missing primary evidence | OPEN risk status correctly retained |
| `12_TRANSACTION_PERIMETER` | Proposed sale perimeter and document gates | PREPARED; agreed signed closing OPEN |
| `13_HANDOVER_PLAN` | Future transfer runbook, credentials migration boundaries | PREPARED; provider/buyer handover NOT_EXECUTED |
| `14_BUYER_QA` | Evidence-qualified draft Q&A | DRAFT; buyer acceptance NOT_RECORDED |
| `15_EVIDENCE_MANIFEST` | Attestation, provenance and claim acceptance controls | DOCUMENTARY; buyer/independent PASS excluded |

### Exhaustiveness definition and non-claims

- **Source inventory completeness:** 80/80 tracked Markdown files in the **defined** five-directory data-room/support-document scope have attributable frozen Git tree object IDs. This is a complete identity index for that bounded set, *not* 100% of the repository's 4929 source blobs.
- **Initial buyer brief claim traceability:** see the 12/12 claim-to-source categories in the preceding V5 section; material unknowns and external primary documents remain OPEN rather than upgraded to PASS.
- **Automated scoped content-screening checkpoint:** DataGuard offline audit V4 GitHub Actions run `38805676055`, job `116665764551`: success, **10/10 test cases**, **30** DataGuard Markdown and **49** adjacent Markdown files in its separate 79-file checkout; no broken tracked local links or secret-pattern hits; one classified company-role mailbox. Its checkout showed `gitHead=699a59f13a300ce0eaa4db9958ac839d10b1dbb6` (GitHub PR ref), **not** the current `main` hash here.
- **Current-doc delta:** V5 increased main's DataGuard Markdown set from 30 to 31 and updated selected documents. Its exact-head action `38807479280` was queued at the earlier checkpoint, and cannot be assumed PASS. A new V6 PR must also obtain its own exact-head CI validation.
- **Risk/claim truth boundary:** explicit gaps remain (signed creator-to-seller IP, official corporate facts, tax/accounting originals, independent terminal security assessment, provider handover rights, production parity and buyer authorization). Screening matches and absence of matches are not forensic/privilege/PII certifications.
- **Re-use and drift:** Source SHA pins in this section must be regenerated from a new frozen tree for any later revision. Do not invent matching SHA for an edited manifest itself. For data-room Stage A release, verify the exact hash and content of the *exported* sanitized copy and owner authorization.
- **Privacy:** This register contains only repository-internal source paths, Git hashes, status categories and dated external-assurance identifiers. It contains no buyer contact, secret value or raw vulnerability payload.

**Provisional internal documentary category #3:** source identity inventory COMPLETE for the defined 80-file Markdown dossier; source acceptance review STAGED and validated by existing V4 plus the pending current-head CI. Global transaction/evidence closure remains UNMEASURABLE from this inventory alone. Buyer release remains HOLD.



## V7 current-main direct document review — 2026-10-15

This is a **second, independent, connector-authenticated source read** following the merge of V6, not a claim that a CI runner has completed V6 tests.

**Read-only immutable baseline:** `main@178bb279ef6c9ebbe5547bf9d78545f3958aaf10`, Git tree untruncated, **4,932** tracked blobs. Five explicitly scoped directories in this register contain **80 Markdown files**, of which **80/80 were fetched by path from the immutable ref, and 80/80 returned blob SHA-1 exactly matched the Git tree**.

| Review batch | Source documents read | Matching Git blob SHA | Exact inline file references inspected | High-confidence secret-pattern signals | Email address signals |
|---|---:|---:|---:|---:|---:|
| 0 — canonical sections 00–09 | 14 | 14 | 33 | 0 | 0 |
| 1 — canonical sections 10–15 | 14 | 14 | 14 | 0 | 0 |
| 2 — remaining canonical + supporting | 14 | 14 | 110 | 0 | 0 |
| 3 — supporting M&A records | 14 | 14 | 0 | 0 | 0 |
| 4 — supporting M&A and buyer files | 14 | 14 | 14 | 0 | 1 |
| 5 — buyer/security support files | 10 | 10 | 11 | 0 | 0 |
| **Total** | **80** | **80** | **182** | **0** | **1** |

All 182 explicit backtick-wrapped local document/source path references, as recognized by the stated bounded checker, resolved to tracked paths in the frozen complete Git tree; **0 missing path targets**. This is a check of specific reference syntax, not all plain-text claims, URLs, Markdown anchors, screenshots, media, filesystem permissions or external originals.

The **sole email signal** was classified via an independent second read as a corporate business-role mailbox in `docs/ma-diligence/STRIPE_LIVE_ACCOUNT_RECONCILIATION_2026-10-06.md`; this document does not reproduce that address. **Unresolved individual email candidates: 0** under that classification. A role mailbox is not permission to distribute the underlying financial document. The high-confidence pattern screen is not a full secret/PII/privilege audit and does not certify absence of all sensitive information.

**Other independently attributable evidence:** V4 GitHub Actions workflow `38805676055` completed SUCCESS and its `data-room-static-evidence` job `116665764551` passed ten of ten unit tests, with a separate 79-document checkout. V6 PR #2489 **MERGED** to main at `178bb279ef6c9ebbe5547bf9d78545f3958aaf10`. Its exact-head GitHub Actions run `38809558493` remained QUEUED when checked. A completed merge is not a successful CI execution. The earlier V5 run `38807479280` also remained QUEUED.

**Evidence status:**
- `SOURCE_IDENTITY_CURRENT_MAIN=PASS_80_OF_80` for these specifically scoped documents.
- `TRACKED_EXPLICIT_PATH_REFERENCES=PASS_182_OF_182` under documented parser limitations.
- `DOCUMENTARY_PREPARATION=10_OF_10` eligible internal deliverables.
- `DOCUMENTARY_FORMAL_VERIFICATION=9_OF_10` while V6 exact-head CI is not successful.
- `BUYER_RELEASE=HOLD`; `LEGAL_EXECUTED=NOT_CREDITED`; `BUYER_ACCEPTED=NOT_CREDITED`.

**No documents, email, messages or account invites were sent.** No production deploy, migration, DataGuard demo operation, destructive repository rewrite or provider mutation was conducted by this review.
