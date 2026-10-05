# RISCK COMPLY — IP Ownership Master

Date: 2026-10-05  
Baseline main SHA: `6219f52c463c367848c1139158e5389d35298ca2`  
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
| Source code authorship history | Git history is available | VERIFIED | Export contributor/commit register for transaction cut-off SHA. |
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

## Contributor register template

| Person/entity | Relationship | Contribution period | Material files/modules | Agreement | IP clause/assignment | Status |
|---|---|---|---|---|---|---|
| OWNER TO CONFIRM | Creator/founder | OWNER TO CONFIRM | Repository-wide or scoped | Controlled evidence required | Controlled evidence required | OPEN |
| OWNER TO CONFIRM | Employee | — | — | — | — | OPEN / N/A |
| OWNER TO CONFIRM | Contractor | — | — | — | — | OPEN / N/A |

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
4. contributor history;
5. security scan summary;
6. secrets-handling statement;
7. source-code disclosure log for each bidder.

## Buyer representations pack — evidence list

Before making a title representation, the seller should have controlled copies of:
- executed creator-to-seller IP instrument(s);
- employee/contractor IP agreements or N/A declarations;
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
OSS_INVENTORY=VERIFIED
CREATOR_TO_SELLER_TRANSFER=IP_CHAIN_GAP
EMPLOYEE_CHAIN=OWNER_INPUT_REQUIRED
CONTRACTOR_CHAIN=OWNER_INPUT_REQUIRED
DOMAIN_TITLE_PROOF=PROVIDER_OR_REGISTRAR_REQUIRED
TRADEMARK_TITLE_PROOF=OFFICIAL_DOCUMENT_REQUIRED_OR_NOT_CLAIMED
IP_ENCUMBRANCE_CONFIRMATION=OWNER_INPUT_REQUIRED
IP_CHAIN_READY_FOR_UNQUALIFIED_BUYER_REPRESENTATION=NO
```
