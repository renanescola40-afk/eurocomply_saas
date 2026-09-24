# Enterprise security questionnaire answers

Status: `INTERNAL_CANONICAL / BUYER_SAFE_REVIEW`. Answers remain evidence-bound and must not be upgraded beyond current attributable proof.

| Question | Draft answer | Evidence / next step |
| --- | --- | --- |
| Do you have ISO 27001? | No. RISCK COMPLY is not currently ISO 27001 certified. | Track readiness in `ISO27001_SOC2_READINESS.md`. |
| Do you have SOC 2? | No. RISCK COMPLY does not currently have a SOC 2 Type I or Type II report. | Track readiness in `ISO27001_SOC2_READINESS.md`. |
| Do you have a pentest? | A third-party black-box web application assessment was completed on 2026-09-12. The original TLS High findings have technical remediation evidence; a clean independent retest/terminal assurance remains open. | Use `PENTEST_READINESS.md` and the confidential report reference; do not call this a clean pentest pass. |
| Do you support SSO/SAML? | Not currently. SSO/SAML is planned as an enterprise capability. | Track in `SSO_MFA_ENTERPRISE_PLAN.md`. |
| Do you enforce mandatory MFA? | Step-up MFA/AAL2 is enforced for protected platform administration and high-risk actions. Tenant-wide mandatory MFA for every workspace user is not currently claimed as complete. | Use `SSO_MFA_ENTERPRISE_PLAN.md` and current protected runtime evidence. |
| Do you provide exportable logs? | Yes, within the implemented tenant-scoped audit evidence-pack flow: RBAC + step-up protected, signed and fail-closed on audit persistence. Production claims remain exact-release evidence-bound. | Use `AUDIT_LOG_EXPORT_IMMUTABILITY_PLAN.md`, `AUDIT_CHAIN.md` and the evidence-pack route/tests. |
| Is tenant segregation proven? | Partially. Organization-scoped RBAC and RLS checks exist, but production evidence must be collected. | Run and archive tenant-isolation/RLS evidence. |
| Is disaster recovery tested? | Not yet. A DR test plan exists but has not been executed. | Execute `DISASTER_RECOVERY_TEST_PLAN.md`. |
| Is backup restore tested? | Not yet. A restore test plan exists but has not been executed. | Execute `BACKUP_RESTORE_TEST_PLAN.md`. |
| Do you have a DPA? | An Article 28 DPA review structure and control matrix are prepared; the DPA is not represented as effective until party/annex/provider/incorporation facts are final. | Use `DPA_DRAFT.md` as the trust pointer and the canonical legal-pack DPA review draft. |
| Do you document subprocessors? | Yes. An active provider/subprocessor register is maintained with purposes, known account/region facts, DPA framework and explicit open gaps. | Use `SUBPROCESSORS.md`; revalidate account-specific facts before contractual disclosure. |
| Do you offer a contractual SLA? | Not currently. SLA framework is draft. | Review `SLA_DRAFT.md`. |
| Do you monitor 24/7? | Not contractually. 24/7 monitoring is not currently offered. | Implement monitoring/on-call before claiming. |
| Do you have a retention policy? | Category-specific retention criteria and controlled export/delete workflows exist; final contractual durations and downstream provider backup/log lifecycle remain evidence-bound. | Review `DATA_PROTECTION.md`, `RETENTION_POLICY_DRAFT.md` and the closure matrix. |
| Do you have granular permissions? | Yes, partially. Organization-scoped RBAC exists and is enforced by server-side guards. | Provide code/evidence under NDA if needed. |
| Do you have immutable audit trails? | RISCK COMPLY has a tamper-evident audit hash chain and signed evidence export. External WORM/legally immutable storage is not currently claimed. | Use `AUDIT_LOG_EXPORT_IMMUTABILITY_PLAN.md` and `AUDIT_CHAIN.md`; do not equate tamper-evident with WORM. |

## External-response rule

Use precise language: say `not currently available`, `draft`, `planned`, or `partially implemented` where appropriate. Do not answer `yes` unless implementation, testing, documentation, and approval evidence exist.
