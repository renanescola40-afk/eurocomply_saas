# RISCK COMPLY Trust Center

Status: draft operational trust package. This repository material documents current controls, gaps, and evidence required for enterprise security reviews. It is not a substitute for external certifications, legal review, or an independent penetration test.

## Current answer matrix

| Control / document | Current status | Customer-safe answer |
| --- | --- | --- |
| ISO 27001 | Not certified | RISCK COMPLY is not currently ISO 27001 certified. ISO 27001 readiness is tracked as a roadmap item. |
| SOC 2 | Not audited | RISCK COMPLY does not currently have a SOC 2 Type I or Type II report. SOC 2 readiness is tracked as a roadmap item. |
| Independent security assessment | Completed with retest boundary open | A third-party black-box web application assessment was completed on 2026-09-12. Original TLS Highs have technical remediation evidence; clean independent retest/terminal assurance remains open. |
| SSO / SAML | Implemented runtime / buyer activation pending | SAML SSO runtime, production schema/RPCs, provider/domain binding and callback provisioning are implemented. Activation requires buyer-specific IdP/domain configuration and end-to-end validation. |
| Mandatory MFA | Implemented / tenant-configurable | Step-up MFA/AAL2 protects platform administration and high-risk actions. Workspace owners/admins can enable a tenant-wide policy that requires an AAL2 session for all workspace access; tenant activation is configurable and is not claimed as enabled for every customer. |
| Exportable logs | Implemented | Tenant-scoped signed audit evidence-pack export is implemented with authorization, step-up protection, complete paginated audit history and fail-closed audit persistence. |
| Tenant segregation | Implemented / release-bound evidence | Organization-scoped RBAC, RLS and negative cross-tenant runtime controls are implemented. Any statement that a specific production release is proven must be backed by exact-release runtime evidence current for that release. |
| Disaster recovery | Provider restore tested / live application failover open | A provider-managed isolated database restore was successfully exercised on 2026-09-19. That drill measured a 10-second provider restore interval and an 11h27m20s backup-age/RPO interval, both within the then-declared 4h RTO / 24h database RPO targets. These are dated drill measurements, not a current-release full-application failover claim. |
| Backup restore | Provider-managed isolated restore evidenced | A Supabase Restore-to-New-Project exercise completed successfully on 2026-09-19 and its restore/RPO timing was retained. The provider restore, migration/RLS invariants and bounded aggregate relationships are evidenced. Exact customer/Auth row completeness for that clone was not retained with backup-time row counts or content digests, and no destructive production restore is claimed. |
| DPA | Review structure complete / not effective | The canonical Article 28 review draft and control matrix exist; final effect depends on party, annex, provider and incorporation facts plus qualified review where required. |
| Subprocessors | Active register / provider facts bounded | The active provider/subprocessor register is maintained with purposes and attributable account/region/DPA facts. Account-specific retention, support/access and transfer facts remain explicitly provider-bound where not confirmed. |
| Contractual SLA | Draft | SLA terms are tracked in this trust package and require commercial/legal review before use. |
| 24/7 monitoring | Not available | 24/7 monitoring and on-call coverage are not currently offered contractually. |
| Retention / deletion | Technical/process structure implemented; provider facts bounded | Category-specific retention and export/delete workflows exist. Exact downstream backup/log lifecycle is stated only where attributable; no unsupported universal fixed period is claimed. |
| Granular permissions | Implemented partially | Role-based organization permissions exist and are enforced through server-side guards. |
| Tamper-evident audit trail | Implemented / WORM not claimed | A tamper-evident audit hash chain and signed audit evidence export are implemented. External WORM/legally immutable storage is not currently claimed. |

## Evidence needed before upgrading claims

1. Completed `package-lock.json` and npm audit remediation where the current dependency gate requires it.
2. Fresh exact-release production RLS/live tenant-isolation evidence before describing the current release as production-proven.
3. A fresh current-release provider-managed clone plus application smoke before claiming current-release full-service recovery/RTO.
4. Backup-bound completeness evidence (for example backup-time counts/digests or equivalent provider evidence) before claiming exact customer/Auth data completeness.
5. Storage-object recovery evidence before claiming Supabase Storage file recovery; database backup restores metadata, not underlying objects.
6. Live application failover evidence before claiming technical failover beyond the measured database-restore drill.
7. Clean independent retest/terminal assurance if required by the buyer or selected assurance target.
8. Final effective DPA/Privacy/Terms publication and provider/retention facts required by the applicable agreement.
9. Tenant-specific activation evidence before claiming a particular customer workspace has the tenant-wide MFA requirement enabled.
10. External WORM/legally immutable audit retention only if such a control is actually implemented and evidenced.

## Rule for customer communication

Do not claim ISO 27001, SOC 2, a clean pentest pass, external WORM immutability, 24/7 monitoring, contractual SLA, live full-application failover, current-release tenant-isolation proof, exact restored-row completeness, or tenant-wide MFA as universally enabled across all customer tenants. The dated 2026-09-19 provider-managed database-restore drill and its measured RTO/RPO may be disclosed only with its historical scope and limitations. Tenant-wide MFA capability may be described as implemented and tenant-configurable. Tamper-evident hash-chain protection and signed audit export may be described only within their implemented evidence boundary.

---
Evidence refresh marker: 2026-10-04 DR evidence reconciliation.
