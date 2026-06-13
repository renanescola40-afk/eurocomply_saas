# Enterprise security questionnaire answers

Status: internal draft. Answers must be reviewed before sending to customers.

| Question | Draft answer | Evidence / next step |
| --- | --- | --- |
| Do you have ISO 27001? | No. EuroComply is not currently ISO 27001 certified. | Track readiness in `ISO27001_SOC2_READINESS.md`. |
| Do you have SOC 2? | No. EuroComply does not currently have a SOC 2 Type I or Type II report. | Track readiness in `ISO27001_SOC2_READINESS.md`. |
| Do you have a pentest? | Not yet. A third-party penetration test has not yet been completed. | Schedule vendor and track in `PENTEST_READINESS.md`. |
| Do you support SSO/SAML? | Not currently. SSO/SAML is planned as an enterprise capability. | Track in `SSO_MFA_ENTERPRISE_PLAN.md`. |
| Do you enforce mandatory MFA? | Not currently as a tenant-level enterprise policy. | Track in `SSO_MFA_ENTERPRISE_PLAN.md`. |
| Do you provide exportable logs? | Partially. Internal audit events exist, but enterprise-grade export is not yet complete. | Track in `AUDIT_LOG_EXPORT_IMMUTABILITY_PLAN.md`. |
| Is tenant segregation proven? | Partially. Organization-scoped RBAC and RLS checks exist, but production evidence must be collected. | Run and archive tenant-isolation/RLS evidence. |
| Is disaster recovery tested? | Not yet. A DR test plan exists but has not been executed. | Execute `DISASTER_RECOVERY_TEST_PLAN.md`. |
| Is backup restore tested? | Not yet. A restore test plan exists but has not been executed. | Execute `BACKUP_RESTORE_TEST_PLAN.md`. |
| Do you have a DPA? | Draft only. Legal review is required before signature. | Review `DPA_DRAFT.md`. |
| Do you document subprocessors? | Draft only. Subprocessors must be reviewed and approved before sharing. | Review `SUBPROCESSORS.md`. |
| Do you offer a contractual SLA? | Not currently. SLA framework is draft. | Review `SLA_DRAFT.md`. |
| Do you monitor 24/7? | Not contractually. 24/7 monitoring is not currently offered. | Implement monitoring/on-call before claiming. |
| Do you have a retention policy? | Draft only. Implementation/evidence is required before external publication. | Review `RETENTION_POLICY_DRAFT.md`. |
| Do you have granular permissions? | Yes, partially. Organization-scoped RBAC exists and is enforced by server-side guards. | Provide code/evidence under NDA if needed. |
| Do you have immutable audit trails? | Not yet. Internal audit events exist, but tamper-evident/immutable retention is not complete. | Track in `AUDIT_LOG_EXPORT_IMMUTABILITY_PLAN.md`. |

## External-response rule

Use precise language: say `not currently available`, `draft`, `planned`, or `partially implemented` where appropriate. Do not answer `yes` unless implementation, testing, documentation, and approval evidence exist.
