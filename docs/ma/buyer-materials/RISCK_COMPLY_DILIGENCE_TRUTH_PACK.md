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
| Vercel production recreation | EXTERNALLY_BLOCKED | Latest exact-main deployment attempt was blocked by overdue-balance/payment action; no billing mutation was performed. |
| Repository confidentiality | OPEN_RISK | Authenticated GitHub evidence on 2026-10-07 reported repository visibility as public. Buyer-contact correspondence was removed from the current tree, but prior merged commits remain reachable in public Git history; do not call the repository/history confidential or repository-safe until history is appropriately remediated or access/visibility strategy is formally resolved. |

## Current production / release boundary

Canonical M&A control-tower evidence records:
- current main SHA identified;
- latest READY Vercel production deployment identified;
- exact SHA equality currently fails;
- Vercel resource creation is blocked by an overdue balance requiring owner payment action.

These facts prevent a buyer-safe claim that the latest main is the currently promoted production build.

## Security assurance boundary

Buyer materials may describe implemented security architecture and evidence. They must not claim:
- SOC 2 / ISO 27001 certification;
- clean terminal independent pentest/retest;
- zero vulnerabilities;
- complete provider transfer;
- perfect enterprise readiness;
- confidentiality of source history while the repository is publicly visible.

## Diligence conclusion

The product is suitable to enter technical diligence with disclosed gaps. This is not equivalent to signing/closing readiness.


## Public Git history confidentiality incident

A buyer-material commit previously introduced named buyer contacts, private request details and unsent reply drafts into a repository that is currently public.

The current tree no longer contains those details. However, ordinary follow-up commits do not erase reachable Git history. Historical commits containing the material remain recoverable while that history remains publicly reachable.

Current classification:
- CURRENT_TREE_PRIVATE_CORRESPONDENCE_REMOVED=YES
- REACHABLE_GIT_HISTORY_EXPOSURE=OPEN
- HISTORY_PURGE_EXECUTED=NO
- REPOSITORY_PRIVATE_MIGRATION_EXECUTED=NO
- CONFIDENTIALITY_CLOSED=NO

No force-push/history rewrite or repository-visibility mutation is performed by this documentation change.
