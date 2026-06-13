# EuroComply Trust Center

Status: draft operational trust package. This repository material documents current controls, gaps, and evidence required for enterprise security reviews. It is not a substitute for external certifications, legal review, or an independent penetration test.

## Current answer matrix

| Control / document | Current status | Customer-safe answer |
| --- | --- | --- |
| ISO 27001 | Not certified | EuroComply is not currently ISO 27001 certified. ISO 27001 readiness is tracked as a roadmap item. |
| SOC 2 | Not audited | EuroComply does not currently have a SOC 2 Type I or Type II report. SOC 2 readiness is tracked as a roadmap item. |
| Independent pentest | Not completed | An independent third-party penetration test has not yet been completed. |
| SSO / SAML | Not available | Enterprise SSO/SAML is planned but not currently available. |
| Mandatory MFA | Not available as an enterprise policy | Mandatory MFA enforcement is planned but not currently available as a tenant policy. |
| Exportable logs | Partial technical coverage | Audit events exist in the product, but enterprise-grade log export is not yet certified as complete. |
| Tenant segregation | Partial / technical controls | Organization-scoped RBAC and RLS checks exist; production evidence must be collected before claiming verified tenant isolation. |
| Disaster recovery | Not tested | A DR test plan is documented, but a formal DR exercise has not yet been executed. |
| Backup restore | Not tested | A backup restore test plan is documented, but a formal restore exercise has not yet been executed. |
| DPA | Draft | A DPA template is tracked in this trust package and requires legal review before customer signature. |
| Subprocessors | Draft | A subprocessors register is tracked in this trust package and must be kept current. |
| Contractual SLA | Draft | SLA terms are tracked in this trust package and require commercial/legal review before use. |
| 24/7 monitoring | Not available | 24/7 monitoring and on-call coverage are not currently offered contractually. |
| Retention policy | Draft | A retention policy is tracked in this trust package and requires implementation/evidence. |
| Granular permissions | Implemented partially | Role-based organization permissions exist and are enforced through server-side guards. |
| Immutable audit trail | Partial | Internal audit events exist, but tamper-evident/WORM audit storage is not yet implemented. |

## Evidence needed before upgrading claims

1. Completed `package-lock.json` and npm audit remediation.
2. Production RLS/live tenant-isolation evidence.
3. Backup restore exercise report.
4. Disaster recovery tabletop or failover test report.
5. Third-party penetration test report and remediation log.
6. Legal-reviewed DPA, subprocessors page, retention policy, and SLA.
7. SSO/SAML and tenant-enforced MFA implementation.
8. Audit log export and tamper-evident retention.

## Rule for customer communication

Do not claim ISO 27001, SOC 2, pentest completion, immutable logs, 24/7 monitoring, contractual SLA, or tested DR/restore until the corresponding evidence is complete and approved.
