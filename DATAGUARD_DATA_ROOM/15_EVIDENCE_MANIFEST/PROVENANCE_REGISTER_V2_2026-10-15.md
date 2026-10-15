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
