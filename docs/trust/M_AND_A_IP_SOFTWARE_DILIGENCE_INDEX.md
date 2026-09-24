# RISCK COMPLY — M&A IP and Software Diligence Index

Date: 2026-09-24  
Release: `e170529f7bb537242b79461052cb32ecbb0f8ea0`  
Status: `IP_SOFTWARE_DILIGENCE_INTERNAL=PASS_INDEX / OWNERSHIP_SIGNATURE_FACTS_EXTERNAL_OR_CONTROLLED`

This is an evidence index, not a legal title opinion and not a representation that unsigned assignments exist.

## Software and repository scope

- Primary repository: `renanescola40-afk/eurocomply_saas`.
- Default branch: `main`.
- Current release truth for this index: `e170529f7bb537242b79461052cb32ecbb0f8ea0`.
- Application source, database migrations, infrastructure/configuration, CI workflows, security runbooks, product documentation, AI Act/GDPR content and design/runtime assets are indexed in the repository or controlled asset stores.
- Repository history/contributors are the authoritative source for contributor attribution; no unsupported statement is made that every contribution is employee-created or formally assigned.

## Buyer diligence categories

| Category | Evidence authority | Sharing class | Boundary |
| --- | --- | --- | --- |
| Source code | primary repository/current accepted release | HIGHLY_CONFIDENTIAL | late-stage, identified buyer, NDA, read-only where possible |
| Repository/history | GitHub repository/commit history | DILIGENCE_ONLY | contribution history is factual; legal ownership conclusion requires applicable agreements/facts |
| Database | `supabase/migrations` and schema evidence | NDA_REQUIRED | no production secrets/data |
| Infrastructure | Vercel/Supabase configuration + repo config | NDA_REQUIRED | redact credentials/account secrets |
| CI/security | `.github/workflows`, security scripts and release evidence | NDA_REQUIRED | exact-SHA evidence only |
| Architecture | architecture/trust docs | INITIAL_SHARE or NDA_REQUIRED depending detail | no secret topology/config |
| Open source | `package-lock.json`, SBOM and license diligence summary | NDA_REQUIRED | no external legal opinion claimed |
| Brand/domain | RISCK COMPLY public brand/domain plus controlled ownership/account evidence | DILIGENCE_ONLY | authoritative registrar/trademark evidence supplied only when available |
| Design assets | repository/public assets and controlled source-design files where retained | DILIGENCE_ONLY | do not invent missing source files |
| Documentation | `docs/`, public Trust Center and legal-review package | INITIAL_SHARE/NDA_REQUIRED | privileged advice excluded |
| AI Act/GDPR content | legal-assurance/compliance docs | NDA_REQUIRED | product support material is not customer compliance guarantee |

## Contribution and assignment rule

For every material non-owner contributor or contractor, diligence must rely on the actual contribution record and applicable employment/contract/assignment terms. Where a signature or assignment is genuinely required and absent, classify it as `WAITING_SIGNATURE`; do not manufacture retroactive ownership evidence.

Generated/AI-assisted code, if present, is not treated as a separate ownership guarantee. The repository remains subject to dependency/license and contribution review.

## Asset-control rule

Domain, brand, design-file and provider-account control should be supported by authoritative account/registrar/platform evidence when requested. This index records the diligence path and must not substitute an internal statement for third-party account proof.

## Source-code disclosure rule

Source code is never part of the automatic initial buyer pack. If granted:
1. identified late-stage buyer;
2. executed NDA;
3. demonstrated need-to-know;
4. controlled read-only access where possible;
5. secrets/customer data removed;
6. scope and release SHA recorded.

## Internal decision

```text
PRIMARY_REPOSITORY_INDEX=PASS
SOURCE_SCOPE_INDEX=PASS
ARCHITECTURE_ASSET_INDEX=PASS
DEPENDENCY_INDEX=PASS
CI_SECURITY_INDEX=PASS
AI_ACT_GDPR_CONTENT_INDEX=PASS
SOURCE_CODE_DISCLOSURE_POLICY=PASS
UNVERIFIED_OWNERSHIP_CLAIM=0
IP_SOFTWARE_DILIGENCE_INTERNAL=PASS_INDEX
```
