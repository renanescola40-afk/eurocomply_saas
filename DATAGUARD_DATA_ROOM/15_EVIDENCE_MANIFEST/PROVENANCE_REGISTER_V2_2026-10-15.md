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
