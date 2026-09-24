# RISCK COMPLY Trust Center

Status: draft operational trust package. This repository material documents current controls, gaps, and evidence required for enterprise security reviews. It is not a substitute for external certifications, legal review, or an independent penetration test.

## Current answer matrix

| Control / document | Current status | Customer-safe answer |
| --- | --- | --- |
| ISO 27001 | Not certified | RISCK COMPLY is not currently ISO 27001 certified. ISO 27001 readiness is tracked as a roadmap item. |
| SOC 2 | Not audited | RISCK COMPLY does not currently have a SOC 2 Type I or Type II report. SOC 2 readiness is tracked as a roadmap item. |
| Independent security assessment | Completed with retest boundary open | A third-party black-box web application assessment was completed on 2026-09-12. Original TLS Highs have technical remediation evidence; clean independent retest/terminal assurance remains open. |
| SSO / SAML | Not available | Enterprise SSO/SAML is planned but not currently available. |
| Mandatory MFA | Not available as an enterprise policy | Mandatory MFA enforcement is planned but not currently available as a tenant policy. |
| Exportable logs | Partial technical coverage | Audit events exist in the product, but enterprise-grade log export is not yet certified as complete. |
| Tenant segregation | Partial / technical controls | Organization-scoped RBAC and RLS checks exist; production evidence must be collected before claiming verified tenant isolation. |
| Disaster recovery | Not tested | A DR test plan is documented, but a formal DR exercise has not yet been executed. |
| Backup restore | Not tested | A backup restore test plan is documented, but a formal restore exercise has not yet been executed. |
| DPA | Review structure complete / not effective | The canonical Article 28 review draft and control matrix exist; final effect depends on party, annex, provider and incorporation facts plus qualified review where required. |
| Subprocessors | Active register / facts partial | The active provider/subprocessor register is maintained with purposes, known region/account facts, DPA framework and explicit open gaps. |
| Contractual SLA | Draft | SLA terms are tracked in this trust package and require commercial/legal review before use. |
| 24/7 monitoring | Not available | 24/7 monitoring and on-call coverage are not currently offered contractually. |
| Retention / deletion | Technical/process structure implemented; final periods partial | Category-specific retention and export/delete workflows exist; final contractual durations and downstream provider lifecycle remain evidence-bound. |
| Granular permissions | Implemented partially | Role-based organization permissions exist and are enforced through server-side guards. |
| Immutable audit trail | Partial | Internal audit events exist, but tamper-evident/WORM audit storage is not yet implemented. |

## Evidence needed before upgrading claims

1. Completed `package-lock.json` and npm audit remediation.
2. Production RLS/live tenant-isolation evidence.
3. Backup restore exercise report.
4. Disaster recovery tabletop or failover test report.
5. Clean independent retest/terminal assurance if required by the buyer or selected assurance target.
6. Final effective DPA/Privacy/Terms publication and provider/retention facts required by the applicable agreement.
7. SSO/SAML and tenant-enforced MFA implementation.
8. Audit log export and tamper-evident retention.

## Rule for customer communication

Do not claim ISO 27001, SOC 2, a clean pentest pass, immutable logs, 24/7 monitoring, contractual SLA, or tested DR/restore until the corresponding evidence is complete and approved.
