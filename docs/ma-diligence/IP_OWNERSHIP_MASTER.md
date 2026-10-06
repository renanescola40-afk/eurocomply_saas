# RISCK COMPLY — IP Ownership Master

Date: 2026-10-05  
Baseline main SHA: `6219f52c463c367848c1139158e5389d35298ca2`  
Extended contributor review cutoff SHA: `ad5ae2b99875659c54b6139d35addbbc2a9cfad9`  
Status: `IP_DILIGENCE_INTERNAL=PASS_DOCUMENTED / IP_CHAIN_GAPS_PRESENT`

This document maps title evidence. It does not create title, substitute for signed assignments, or make a legal ownership opinion.

## Documentary chain under review

```text
CREATOR(S)
  -> SOURCE CODE / DATABASE / DOCUMENTATION / DESIGN
  -> SELLER ENTITY: SAMUEL CERQUEIRA, UNIPESSOAL LDA
  -> DOMAIN: risckcomply.com
  -> BRAND: RISCK COMPLY
  -> BUYER
```

The repository proves technical history and asset existence, not automatically legal title in the seller entity.

## Ownership map

| Asset | Current evidence | Classification | Gap / action |
|---|---|---|---|
| Primary source repository | Repository exists and is controlled through linked GitHub account | VERIFIED | Repository control is not by itself an IP assignment. |
| Source code authorship history | Full GitHub API walk completed on 2026-10-06 across 182 pages / 18,111 reachable commits; human/account and automation identities were enumerated | VERIFIED_FULL_HISTORY | Document the relationship of legacy account identities before title representation. |
| Creator ownership to seller | No executed transfer instrument identified in reviewed repo | **IP_CHAIN_GAP** | Execute counsel-approved assignment/license as required before sale. |
| Employee contributions | No complete employee contribution register found | OWNER_INPUT_REQUIRED | Confirm whether any employees contributed and provide employment/IP clauses. |
| Contractor contributions | No complete contractor register found | OWNER_INPUT_REQUIRED | Identify contractors and locate signed IP assignment/work-for-hire clauses. |
| AI-assisted/generated code | Possible operational use is not treated as title proof | DOCUMENTED | Preserve provenance policy and review provider terms if material. |
| Domain `risckcomply.com` | Runtime/domain use is evidenced | VERIFIED | Registrar account ownership/export still required as title/control proof. |
| RISCK COMPLY brand/trademark | Public use evidenced | DOCUMENTED | Trademark registration/filing/ownership evidence not established. |
| Logo/design assets | Repository/public assets exist | DOCUMENTED | Confirm creator/source-file ownership and any third-party stock/font licenses. |
| Documentation copyright | Repository documentation exists | VERIFIED | Confirm contributor chain into seller entity. |
| Database rights | Database/schema/migrations are evidenced | DOCUMENTED | Counsel to determine ownership/database-right scope and seller chain. |
| Third-party code | Lockfile/license inventory exists | VERIFIED | Maintain release-SHA SBOM and notice obligations. |
| Open-source inventory | 940 lockfile package entries reviewed on 2026-09-24; zero missing license metadata in that inventory | VERIFIED | Refresh on transaction SHA. |
| Copyleft review | LGPL-bearing sharp/libvips entries identified; no AGPL/GPL-only package identified in that lockfile inventory | DOCUMENTED | Legal compatibility review still not claimed. |
| Commercial dependencies | Vercel, Supabase, Stripe, Google, Sentry, Upstash/Redis, Resend, GitHub and other conditional services | VERIFIED/PARTIAL | Account terms, transferability and change-of-control review required. |
| IP encumbrances | None can be safely claimed from repository alone | OWNER_INPUT_REQUIRED | Confirm liens, licenses, pledges, exclusivity, prior assignments and disputes. |

## Observed contributor evidence — extended history review

A dated review began with the 300 most recent commits and was expanded to a complete GitHub API pagination walk on 2026-10-06. Pages 1–181 returned 100 commits each and page 182 returned 11, for **18,111 reachable commits** from current main history through oldest observed commit `582764aee73376ce463142773df685c677de6e11`. The full walk produced the following aggregate identity counts:

| Observed linked/account identity | Full-history commits |
|---|---:|
| `renanescola40-afk` | 15,903 |
| `renansilva2002-tech` | 935 |
| `sastestezoer-commits` | 796 |
| `soltomstorevendas-web` | 378 |
| `dependabot[bot]` | 60 |
| `github-actions[bot]` | 32 |
| Other named release/security/evidence/PR bots | 7 |

The earlier first-300 sample returned:

| Observed author identity | Commits in sample | Diligence classification |
|---|---:|---|
| `renanescola40-afk` | 220 | HUMAN/OWNER-LINKED ACCOUNT — relationship/title still requires legal evidence |
| `sastestezoer-commits` | 77 | AUTOMATION/COMMIT ACCOUNT — owner/control relationship must be documented |
| `dependabot[bot]` | 3 | THIRD-PARTY AUTOMATION BOT; dependency updates are not a human ownership claim |

The expanded history review later revealed additional recurring identities, including `renansilva2002-tech` and `soltomstorevendas-web`, plus GitHub Actions and other sparse automation identities. Sample commits for the two legacy human-looking accounts are predominantly merge/integration activity into the same repository. This is **not** enough to treat them as the same owner or as third-party contractors; an account-control/relationship declaration remains required.

## Contributor register

| Person/entity/account | Relationship | Evidence | IP clause/assignment | Status |
|---|---|---|---|---|
| `renanescola40-afk` | Owner-linked primary repository account | Git history and repository control | No executed creator-to-seller transfer instrument identified | **IP_CHAIN_GAP** |
| `sastestezoer-commits` | Automation/commit account | 77/300 observed commits | Must document account control and whether code was generated/committed on owner's behalf | OPEN_DOCUMENTATION |
| `dependabot[bot]` | GitHub dependency automation | 3/300 observed commits | Governed by third-party package licenses; no human assignment expected | NOT_APPLICABLE_AS_HUMAN_CONTRIBUTOR |
| `renansilva2002-tech` | Legacy GitHub identity; relationship unproven | Repeated historical merge commits observed | Account-control/relationship declaration required | OPEN_DOCUMENTATION |
| `soltomstorevendas-web` | Legacy GitHub identity; relationship unproven | Repeated historical merge/integration commits observed | Account-control/relationship declaration required | OPEN_DOCUMENTATION |
| Other employees | No account may be classified as employee from Git history alone | Extended history review | Owner confirmation + employment/IP agreements if any | OPEN / POSSIBLY_NA |
| Other contractors | No account may be classified as contractor from Git history alone | Extended history review | Owner confirmation + contractor/IP agreements if any | OPEN / POSSIBLY_NA |

Do not convert Git commit authors into legal ownership conclusions without the underlying relationship/agreement.

## IP assignment remediation template — NOT EXECUTED

**Purpose:** counsel drafting aid only.

Required fields:
- assignor legal name and identifier;
- assignee: SAMUEL CERQUEIRA, UNIPESSOAL LDA;
- precise assets: source code, object code, database/schema, documentation, designs, logos, domains/registrar rights where assignable, trademarks/filings, inventions, know-how;
- repository and cut-off SHA;
- historical and future modifications;
- copyright and database-right language;
- moral-rights treatment to extent legally permitted;
- warranties on authority, prior grants and encumbrances;
- third-party/open-source carve-outs;
- consideration and effective date;
- governing law, signatures and acceptance.

```text
TEMPLATE_STATUS=DRAFT_ONLY
LEGAL_EFFECT=NONE_UNTIL_VALIDLY_EXECUTED
COUNSEL_REVIEW_REQUIRED=YES
```

## Source access / security history

Source is maintained in GitHub with protected `main`, required security/quality checks and documented production release controls. For M&A, export:
1. current repository owner/admin list;
2. branch protection/rules evidence;
3. transaction cut-off SHA;
4. full contributor history;
5. security scan summary;
6. secrets-handling statement;
7. source-code disclosure log for each bidder.

## Buyer representations pack — evidence list

Before making a title representation, the seller should have controlled copies of:
- executed creator-to-seller IP instrument(s);
- employee/contractor IP agreements or N/A declarations;
- account-control declaration for automation commit identities;
- domain registrar ownership/control export;
- trademark registration/filing evidence or explicit unregistered-mark disclosure;
- design/logo provenance;
- current SBOM + OSS license report;
- commercial software/service licenses;
- encumbrance/dispute disclosure;
- repository ownership/admin export;
- board/shareholder approval if required.

## Current conclusion

```text
SOURCE_REPOSITORY_EXISTENCE=VERIFIED
CONTRIBUTOR_HISTORY_REVIEWED=18111_COMMITS_FULL_API_WALK
LEGACY_ACCOUNT_IDENTITIES_FOUND=YES
FULL_HISTORY_EXPORT_FINAL_PAGE=CLOSED
HUMAN_RELATIONSHIP_CLASSIFICATION=NOT_INFERRED
OSS_INVENTORY=VERIFIED
CREATOR_TO_SELLER_TRANSFER=IP_CHAIN_GAP
EMPLOYEE_CHAIN=OWNER_INPUT_REQUIRED
CONTRACTOR_CHAIN=OWNER_INPUT_REQUIRED
DOMAIN_TITLE_PROOF=PROVIDER_OR_REGISTRAR_REQUIRED
TRADEMARK_TITLE_PROOF=OFFICIAL_DOCUMENT_REQUIRED_OR_NOT_CLAIMED
IP_ENCUMBRANCE_CONFIRMATION=OWNER_INPUT_REQUIRED
IP_CHAIN_READY_FOR_UNQUALIFIED_BUYER_REPRESENTATION=NO
```

## Canonical closure artifacts — 2026-10-06

The title-chain remediation and sale handoff are now separated into canonical evidence-bound artifacts:

- `CREATOR_CONTRIBUTOR_REGISTER.md`
- `IP_CHAIN_OF_TITLE_EVIDENCE_PACK.md`
- `IP_ENCUMBRANCE_REGISTER.md`
- `ASSET_TITLE_REGISTER.md`
- `OWNER_DOCUMENT_REQUEST_PACK.md`
- `TRANSACTION_DECISION_MATRIX.md`
- `CORPORATE_IP_TITLE_FINAL_CLOSURE_MATRIX.md`

These files improve internal diligence completeness but do not convert the open creator-to-seller assignment into an executed transfer.
