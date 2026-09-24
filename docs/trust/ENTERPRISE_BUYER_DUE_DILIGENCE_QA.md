# RISCK COMPLY — Enterprise Buyer Due Diligence Q&A

Date: 2026-09-24  
Status: `BUYER_SAFE / INTERNAL_CANONICAL`

This document is a buyer-safe factual answer set. It does not create certifications, legal opinions, buyer acceptance, customer evidence or provider facts that are not attributable.

| Topic | Current buyer-safe answer | Classification |
| --- | --- | --- |
| Product | B2B AI governance/compliance platform supporting AI inventory, risk classification, evidence, governance, assessments, monitoring and procurement workflows. | PASS_INTERNAL |
| Architecture | Next.js application with Supabase Auth/Postgres, organization-scoped authorization, RLS, Stripe billing boundaries and controlled provider integrations. | PASS_INTERNAL |
| Hosting / database | Production architecture and regions are disclosed only where attributable; primary Supabase production project is evidenced in eu-west-1. | PASS_INTERNAL / provider facts partial |
| Encryption | Provider/platform encryption and application security claims remain evidence-bound to current provider/runtime configuration; no unsupported custom-cryptography claim is made. | PASS_INTERNAL |
| RLS / tenant isolation | Forced RLS, tenant-scoped authorization and cross-tenant security controls are implemented; production claims remain exact-release evidence-bound. | PASS_INTERNAL / runtime evidence bound |
| RBAC | Organization-scoped RBAC/server guards are implemented. | PASS_INTERNAL |
| Authentication | Supabase Auth with protected administration and step-up security controls. | PASS_INTERNAL |
| MFA | Step-up MFA/AAL2 protects platform administration and high-risk actions. Tenant-wide mandatory MFA for every workspace user is not claimed as complete. | PASS_INTERNAL_WITH_BOUNDARY |
| SSO/SAML | Do not promise customer-ready SAML/SSO until current provider/runtime and enterprise IdP validation are attributable. | WAITING_PROVIDER_FACT / implementation boundary |
| Audit logs | Tenant-scoped audit events, hash-chain verification and signed evidence-pack export exist. | PASS_INTERNAL |
| Audit immutability | Tamper-evident hash chain: yes. External WORM/immutable storage: not claimed. | PASS_INTERNAL_WITH_BOUNDARY |
| Backups | Backup/recovery procedures exist. Completed isolated restore evidence must be attributable before claiming measured restore performance. | WAITING_PROVIDER_FACT / evidence event |
| DR | DR plan/runbooks exist. Measured RTO/RPO are only stated when a real test provides them. | PASS_INTERNAL_PLAN / measured evidence pending |
| Incident response | Intake, severity, containment, evidence preservation, communication, recovery and postmortem/CAPA workflow are documented. No 24/7 staffed-response claim is made. | PASS_INTERNAL |
| Privacy/GDPR | ROPA, Art. 13/14 matrix, DSR controls, transfer register, provider register and technical/privacy controls exist. Final legal publication/contract facts remain separately governed. | PASS_INTERNAL |
| DPA | Article 28 review structure, TOM references and annex framework exist. Signature/incorporation/counterparty facts remain external. | PASS_INTERNAL / WAITING_BUYER |
| Subprocessors | Active provider/subprocessor register exists with explicit unresolved provider-specific facts. | PASS_INTERNAL |
| Transfers | Chapter V register separates DPA/Article 28 from SCC/DPF/adequacy/TIA analysis. Unknown flow/provider facts remain explicit. | PASS_INTERNAL |
| Data residency | No blanket EU-only claim. Provider/account-specific storage/access/support locations are disclosed only where attributable. | PASS_INTERNAL |
| Retention | Category-specific retention policy exists; provider backup/log lifecycle and final contractual durations remain evidence-bound. | PASS_INTERNAL |
| Export/delete | Controlled GDPR export and deletion-request workflows exist with authorization, step-up and audit controls. | PASS_INTERNAL |
| AI Act | Current scope documentation, governance, risk/classification and change-trigger controls exist; RISCK COMPLY does not guarantee customer compliance. | PASS_INTERNAL |
| Vulnerability management | CI/security checks, dependency/SCA/SAST controls, CodeQL/secret scanning and pentest-readiness evidence exist. | PASS_INTERNAL |
| Pentest | Third-party black-box assessment completed 2026-09-12; technical remediation evidence exists; clean independent retest/terminal assurance remains external. | WAITING_EXTERNAL_SECURITY |
| ISO 27001 | Not certified. Internal readiness material exists only. | WAITING_EXTERNAL_SECURITY |
| SOC 2 | Not audited. Internal readiness material exists only. | WAITING_EXTERNAL_SECURITY |
| SLA | Buyer-review framework exists; negotiated availability/credits/support terms require signed commercial agreement and operational evidence. | PASS_INTERNAL / WAITING_BUYER |
| Support | Current support channels and incident boundaries are documented; no unsupported 24/7 human-support commitment. | PASS_INTERNAL |
| Open-source / supply chain | SBOM generation/attestation and dependency/license evidence exist; no formal external legal license opinion is claimed. | PASS_INTERNAL |
| IP/software diligence | Repository, architecture, documentation, brand/domain and third-party dependency evidence can be indexed; human signatures/assignments remain separate where legally required. | PASS_INTERNAL / WAITING_SIGNATURE if applicable |

## Response rule

Use the narrowest truthful claim. A repository control may be implementation-complete while a production proof, provider fact, negotiated schedule, clean retest, certification or buyer acceptance remains external.
