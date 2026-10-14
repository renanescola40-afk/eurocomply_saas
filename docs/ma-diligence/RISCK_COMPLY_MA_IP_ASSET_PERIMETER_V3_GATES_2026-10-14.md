# RISCK COMPLY — M&A IP CLOSURE V3 — Evidence Gate Register
Date: 2026-10-14
Status: DRAFT_COMPLETE / LEGAL_CLOSURE=NO_PASS / PRODUCTION_UNTOUCHED.

## What changed in V3
1. Strengthened offline manifest generator: refuses non-/tmp output, avoids symlink following, segregates restricted paths, emits SHA-256 for tracked ordinary files.
2. Added a node:test fixture verifying classification, exclusion, and refusal of unauthorized output.
3. These changes are written to the isolated branch but the test has not been executed against the actual repository, nor has a full per-file asset inventory been generated. Test code presence is not a passed test.

## Gate register and hard dependencies
| Gate | Acceptance criterion | Current classification | Permitted next step |
|---|---|---|---|
| M-IP-01 | Reproducible committed-source asset manifest at immutable Git SHA with path hashes and no secrets | TOOL_DRAFT_COMPLETE / EVIDENCE_OPEN | Run and inspect offline manifest; archive securely |
| M-IP-02 | Legal owner for source, schema, docs and designs established by author agreements and executed chain | SIGNATURE_REQUIRED | Counsel-reviewed rights instrument and human signatures |
| M-IP-03 | Material contributor identities and right-to-transfer resolved | OPEN | Owner factual declarations backed by agreements |
| M-IP-04 | OSS exact-SHA license compliance incl. flagged LGPL review | LEGAL_REVIEW_REQUIRED | Generate exact-SHA SBOM; counsel-led exceptions review |
| M-IP-05 | Domain registrar record proves registrant and transfer procedure | OPEN | Controlled registrar export |
| M-IP-06 | Brand and design provenance, trademark status and any registration verified | OPEN | Jurisdiction search/source files/right grants |
| M-IP-07 | Seller official legal authority and tax/registry position corroborated | OPEN | Registry, RCBE, articles, CAE, tax/legal review |
| M-IP-08 | Provider-specific buyer handover accepted by provider where required | THIRD_PARTY_CONSENT_REQUIRED_OR_MIGRATION | Obtain eligibility/approval or establish buyer replacement |
| M-IP-09 | Contract terms, APA exhibits, liabilities, pricing, approvals settled | LEGAL_REVIEW_REQUIRED / SIGNATURE_REQUIRED | Buyer/counsel negotiation and execution |
| M-IP-10 | Actual code transfer and buyer acceptance recorded | OPEN | Perform only at specifically authorized closing |

No status can be promoted by drafting a template, creating a test or counting a Git commit. Dependencies M-IP-02, 03, 05, 06, 07, 08 and 09 require genuine owner, legal, registrar, corporate, buyer or provider evidence.

## Quantitative controls
- Ten internally specified *document categories* have drafts = 10/10 (100% STRUCTURAL_DOCUMENT_COVERAGE). This metric intentionally does not count complete legal instruments.
- Sixteen high-level inventory categories documented = 16/16 (100% HIGH_LEVEL_CATEGORY_COVERAGE). Not an exhaustive source file inventory.
- File-level asset reconciliation completed = UNMEASURED, pending actual manifest execution/review.
- M&A global evidence closure remains 37.0/98 (37.76%) under last checked 2026-10-08 matrix; remaining 62.24%. No numerator uplift from tool-writing.
- Seller IP title legally verified in this dossier's 16 coarse categories = 0/16 credited (0%), pending signed and authoritative rights evidence.
- Critical legal closing gates achieved = 0/10 fully evidenced in this stricter gate set; it is not a substitute for or merged with the canonical 98-item matrix.

## Read-only and confidentiality boundary
No production data copies, demo mutations, provider account handover, email outreach, DNS changes, billing changes, live asset transfer, PR merge, executed signatures or declarations of buyer consent are performed. Preserve NDA/staged-data-room controls. Repo visibility has been historically reported public and must be rechecked before uploading sensitive manifests or title instruments.
