# RISCK COMPLY — Definitive Asset Title Register

Date: 2026-10-06

| Asset | Owner claim | Attributable evidence | Legal title status | Transfer method | Buyer handoff method | Open gap |
|---|---|---|---|---|---|---|
| Source code | Seller intended as sale owner; creator-to-seller chain not executed | Git history/repository | PARTIAL / CHAIN GAP | Creator-to-seller assignment then transaction transfer as applicable | Repository export/admin transfer + executed title documents | Executed chain instrument |
| GitHub repository | Operationally controlled | Linked repository/admin history | CONTROL VERIFIED; IP TITLE SEPARATE | GitHub repo/org transfer or buyer-admin handoff | Transfer repository/admin access at close | Provider/account closing steps |
| Domain `risckcomply.com` | Seller/product operational use | Production/domain references | PARTIAL | Registrar transfer/account change subject to registrar rules | Auth/EPP/transfer process through controlled closing | Registrar title/control export |
| RISCK COMPLY brand | Seller/product use | Public product/docs | PARTIAL | Assignment of owned unregistered/registered rights as applicable | Brand schedule + filing transfer if any | Registration/ownership proof if claimed |
| Logo | Product asset | Repository/public assets | PARTIAL | Copyright/design assignment subject to provenance | Source files + rights schedule | Creator/license provenance |
| Design system/UI assets | Product asset | Repository | PARTIAL | Copyright/design assignment | Source files/repository handoff | Third-party font/stock/license review |
| Documentation | Product/seller asset subject to creator chain | Git history/docs | PARTIAL | Copyright assignment | Data-room/repository export | Creator/contributor chain |
| Database schema/migrations | Product asset subject to creator chain | Repository migrations/schema | PARTIAL | Assignment of copyright/database rights to extent transferable | Schema/migration export + DB handoff | Legal title chain |
| Production/customer data | Seller-controlled only to extent law/contract permits | Production systems/provider controls | RESTRICTED / NOT SIMPLE IP TITLE | Transaction/data migration subject to privacy/contracts/law | Controlled migration, minimization and buyer access controls | Actual customer/legal basis/transaction structure |
| Pipeline/commercial data | Seller business records | Mailbox/pipeline register | PARTIAL/CONTROLLED DATA | Business-record transfer subject to privacy/confidentiality | Sanitized export/data-room | Buyer-specific privacy/confidentiality review |
| Security materials | Seller operational materials | Security docs/config evidence | PARTIAL/CONFIDENTIAL | Transfer only what is owned and safe; rotate secrets | Controlled security handoff; never transfer live secrets blindly | Closing rotation plan |
| Commercial materials | Seller/product materials | Sales/docs | PARTIAL | Copyright/business asset assignment | Data-room/export | Creator/third-party provenance where material |
| Cloud accounts | Account control varies by provider | Provider matrices | CONTRACTUAL CONTROL, NOT AUTOMATIC TITLE | Provider-supported transfer/admin migration | Buyer admin/handoff per provider | Account-owner/billing/transfer execution |
| SBOM | Product evidence artifact | Current SBOM workflow | CLOSED AS ARTIFACT | Deliver with source transaction package | Regenerate at transaction SHA | Refresh only |
| OSS dependencies | Third-party licensed | Lockfile/license inventory | THIRD-PARTY RIGHTS | Not assigned; pass through under licenses | Notices/SBOM/license obligations | Ongoing license compliance |

```text
ASSET_REGISTER=PASS
UNSUPPORTED_TITLE_CLAIMS=NONE_INTENDED
BUYER_HANDOFF_PATHS_DOCUMENTED=YES
```
