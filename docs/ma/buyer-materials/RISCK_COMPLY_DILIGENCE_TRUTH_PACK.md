# RISCK COMPLY — Diligence Truth Pack

Date: 2026-10-07
Purpose: buyer-safe status map. Green status is never inferred from intent or documentation alone.

| Area | Status | Buyer-safe statement |
|---|---|---|
| Authentication | IMPLEMENTED / EVIDENCED | Supabase-based auth and protected application flows are documented. |
| RBAC | IMPLEMENTED / EVIDENCED | Role-aware organization/workspace authorization exists with enterprise evidence. |
| RLS | IMPLEMENTED / EVIDENCED | Supabase/Postgres RLS tenant controls are documented and form a core data boundary. |
| Tenant isolation | IMPLEMENTED / EVIDENCED | Tenant-isolation evidence exists; buyer should review current accepted evidence artifacts. |
| BOLA / IDOR protections | IMPLEMENTED / EVIDENCED | Authorization and tenant-boundary hardening is documented across sensitive flows. |
| MFA / step-up | IMPLEMENTED_WITH_EVIDENCE_BOUNDARY | Step-up/MFA evidence exists; current runtime scope should be read from the latest accepted evidence. |
| SSO / SAML / SCIM | IMPLEMENTED_OR_EVIDENCED_BY_CURRENT_PACK | Enterprise integration evidence exists in repository; buyer validation should use current runtime artifacts. |
| Audit logs / chain | IMPLEMENTED / EVIDENCED | Audit/event evidence and chain-validation materials exist. |
| AI inventory | IMPLEMENTED | Core product module. |
| Assessments / reassessment | IMPLEMENTED | Core governance workflows exist. |
| Document generation | IMPLEMENTED | Product/document evidence exists. |
| Billing / Stripe | IMPLEMENTED / LIVE_ACCOUNT_EVIDENCE | Stripe LIVE evidence shows zero invoices and zero charges at the reviewed evidence point. Total product revenue/MRR/ARR remain OPEN_ACCOUNTING_CONFIRMATION until complete accounting, bank and contract records are reconciled. |
| SBOM / OSS | EVIDENCED | SBOM, attestation and OSS/license diligence exist. |
| Vulnerability management | EVIDENCED_INTERNAL | CI/security/dependency controls exist; this is not a certification. |
| Backups / recovery | EVIDENCED_WITH_BOUNDARY | DR/recovery materials exist; claims must remain tied to current accepted evidence. |
| Pentest / independent terminal assurance | OPEN / NOT_CREDITED_PASS | Do not claim a clean independent terminal retest until evidence exists. |
| GDPR/privacy | IMPLEMENTED_MATERIALS / LEGAL_BOUNDARY | Privacy/GDPR product and diligence materials exist; no legal approval is implied. |
| EU AI Act | IMPLEMENTED_PRODUCT_DOMAIN | AI Act governance capabilities exist; software use is not regulatory approval. |
| Procurement | PASS_INTERNAL | Procurement/trust packs are internally ready; buyer acceptance is external. |
| Provider transfer | PARTIAL | Provider-specific handoff/transfer paths exist; no provider is represented as fully transferred. |
| Main = production SHA | FAIL | Current main and latest READY production SHA are not equal. |
| Vercel production recreation | HISTORICAL_PAYMENT_BLOCKER / CURRENT_RECHECK_REQUIRED | Earlier exact-main release/resource actions reported an overdue billing condition. Later authenticated Vercel evidence confirms at least one production deployment READY on 2026-10-15; that does not prove account balance, new-resource entitlements or source parity. |
| Repository confidentiality | CURRENT_REPOSITORY_PRIVATE / HISTORICAL_EXPOSURE_OPEN | Authenticated GitHub repository metadata confirms visibility **private** as of 2026-10-15. Historical publicly reachable commits may still exist in forks, external clones and caches. Repository privacy is not evidence of complete historical purge. No blanket source-share permission. |

## Current production / release boundary

Canonical M&A control-tower evidence records:
- current main SHA identified;
- latest READY Vercel production deployment identified;
- exact SHA equality currently fails;
- a prior Vercel resource-creation/billing block is documented; its **current** status has not been revalidated against provider billing and must not be stated as an active universal block. Vercel READY production was subsequently observed, without proving source parity.

These facts prevent a buyer-safe claim that the latest main is the currently promoted production build.

## Security assurance boundary

Buyer materials may describe implemented security architecture and evidence. They must not claim:
- SOC 2 / ISO 27001 certification;
- clean terminal independent pentest/retest;
- zero vulnerabilities;
- complete provider transfer;
- perfect enterprise readiness;
- complete confidentiality of historical material merely because the repository is currently private; public forks, caches and prior clones have not been cleared.

## Diligence conclusion

The product is suitable to enter technical diligence with disclosed gaps. This is not equivalent to signing/closing readiness.


## Public Git history confidentiality incident

A buyer-material commit previously introduced named buyer contacts, private request details and unsent reply drafts into a repository that was **historically public**. Authenticated GitHub metadata on 2026-10-15 shows the canonical repository is now **private**.

Prior reviews reported removal from the current tree. Ordinary follow-up commits do not erase historical Git objects. Private visibility reduces access to the canonical repository but does not establish that affected public forks, cached views or third-party clones have been purged. Present-day public reachability has NOT been exhaustively verified.

Current classification:
- CURRENT_TREE_PRIVATE_CORRESPONDENCE_REMOVED=YES
- HISTORICAL_PUBLIC_EXPOSURE_REMEDIATION=OPEN
- HISTORY_PURGE_EXECUTED=NOT_EVIDENCED
- REPOSITORY_VISIBILITY=PRIVATE_VERIFIED_2026_10_15
- VISIBILITY_CHANGE_TIME=NOT_VERIFIED
- FORKS_CACHES_AND_PRIOR_CLONES=NOT_CLEARED
- CONFIDENTIALITY_CLOSED=NO

No force-push/history rewrite or repository-visibility mutation is performed by this documentation change.


## Dated 2026-10-15 evidence reconciliation

- **Canonical GitHub repository visibility:** `private`, from authenticated repository metadata on 2026-10-15. This statement supersedes the 2026-10-07 visibility snapshot only; it does not erase exposure while public.
- **Production linkage:** a read-only Vercel lookup on 2026-10-15 found READY deployment `dpl_G46QK2En1purZiDjnDMamBjcWrEB` linked to source `3310757dc82c2f5b07a5763b2e4b6e9fc5b4bfc5`. At that check, `main` was 24 commits ahead. Because `main` changes, no permanent commit-drift number or deployed feature claim follows from that snapshot.
- **Confidentiality:** current private visibility `VERIFIED`; public-fork/cache/history purge `NOT_VERIFIED`; full confidentiality closure `NO`. Source access remains restricted.
- **Buyer status:** no external buyer disclosure, offer, signed chain of title, completed independent terminal security assurance, provider transfer or buyer acceptance is inferred.
