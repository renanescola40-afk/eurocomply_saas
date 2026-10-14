# RISCK COMPLY — M&A IP Perimeter V2 Reconciliation
Date: 2026-10-14
Status: DRAFT_COMPLETE (evidence-index reconciliation only); NOT_EXECUTED.

## Newly cross-checked authoritative sources
- `docs/ma-diligence/CREATOR_CONTRIBUTOR_REGISTER.md`: 182 historical pages / 18,111 reachable commits reconciled as of 2026-10-06; identities include `renanescola40-afk`, `renansilva2002-tech`, `sastestezoer-commits`, `soltomstorevendas-web` and bot accounts. These statistics are historical source assertions, not a new independent commit-history replay.
- `docs/ma-diligence/IP_CHAIN_OF_TITLE_EVIDENCE_PACK.md`: creator-to-seller transfer expressly NOT_EXECUTED; legal effect NONE.
- `docs/ma-diligence/CORPORATE_IP_TITLE_FINAL_CLOSURE_MATRIX.md`: official registry/RCBE/authority evidence and domain title are external blockers.
- `docs/ma-diligence/ASSET_TITLE_REGISTER.md`: distinguishes repo control from copyright title and provider contracts.
- `docs/ma-diligence/M_AND_A_REQUIREMENT_STATUS_MATRIX.md`: global M&A diligence score 37/98 = 37.76% according to the 2026-10-08 matrix, not updated by draft documentation.

## Offline exact-SHA file-level asset inventory
`scripts/ma/generate-asset-manifest.mjs` is a local-only inventory generator, adding a per-file SHA-256, byte length, category and default `UNREVIEWED_LEGAL_TITLE_AND_LICENSE` flag. It runs `git ls-files` and excludes content/bytes of sensitive-looking paths from hashes, while retaining restricted placeholders. It does not fetch online accounts, disclose file contents, transfer anything or alter production.

Run from checked-out branch with Node >=22:
```bash
node scripts/ma/generate-asset-manifest.mjs /tmp/risck-ma-asset-manifest
```
The manifest is written outside the repository with owner-only file permissions; manually secure and review it before any buyer disclosure. It is not executed or validated by this PR; a local checkout and independent verification are still required. Its content and classification do not certify IP ownership. Review at closing must freeze the exact source SHA and the resulting manifest and make buyer-delivery decisions per file.

## Contributor identity closure matrix
| Account | Historic register observation | What is still required | State |
|---|---|---|---|
| renanescola40-afk | 15,903 linked commits | creator identity/rights confirmation; executed company title chain | SIGNATURE_REQUIRED |
| renansilva2002-tech | 935 | owner-confirmed identity and relevant chain | OPEN |
| sastestezoer-commits | 796 | owner declaration of automation control and upstream provenance | OPEN |
| soltomstorevendas-web | 378 | owner-confirmed identity and relevant chain | OPEN |
| Dependabot | 60 | exact-sha dependency/OSS obligations | LEGAL_REVIEW_REQUIRED |
| GitHub Actions | 32 | confirm generated works provenance if material | OPEN |
| seven other bot commits | 7 | account attribution where material | OPEN |

These counts add to 18,111 but a Git identity count cannot be converted into a number of legal authors or title approvals.

## Immediate transaction blockers (strictly no invented closure)
1. Creator-to-seller signed, counsel-reviewed software/IP conveyance is absent from reviewed evidence.
2. Relevant contributor authorizations/contracts and owner declarations remain open.
3. Seller company registry, manager authority, beneficial ownership and applicable approvals require official support.
4. Domain registrar proof and brand/design ownership need authoritative checks.
5. OSS, especially flagged LGPL material, must be reviewed at frozen manifest SHA.
6. Provider account transfers require buyer- and provider-specific decisions; migration may be required instead.
7. No transaction-specific APA, signed transfer, closing delivery or buyer acceptance is evidenced.

## Completion accounting (scope-separated)
- V1 category inventory: 16/16 category rows drafted (100% structural coverage, not exhaustive source accounting).
- V1+V2 draft deliverable types: 10/10 prepared; this additional file reconciles references and adds an unexecuted local generator.
- Source file-by-file audited coverage: UNMEASURED until script executed and inventory reviewed.
- Legal title independently verified at the V1 asset-row level: 0/16 credited in this working paper, not assertion that rights are missing.
- Auditable global M&A evidence closure from latest consulted canonical 2026-10-08 matrix: 37.76% COMPLETE; 62.24% REMAINING, pending new primary evidence.
- Closing readiness: NO_PASS.

No production writes, demo writes, provider account moves, DNS changes, customer emails, main merges or signed legal acts were made.
