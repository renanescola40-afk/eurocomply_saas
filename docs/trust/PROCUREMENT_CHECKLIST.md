# Enterprise procurement checklist

Status: buyer-facing checklist for enterprise review. This checklist helps a buyer evaluate Risck comply without requiring unsupported compliance claims. It is not a certification report, legal opinion, DPA, or security audit.

## How to use this checklist

Use this checklist before answering an enterprise questionnaire, signing a security schedule, or making a sales claim about security, privacy, resilience, or compliance posture.

Each item should be marked as one of:

- `Complete`: evidence is attached and current.
- `Partial`: evidence exists, but scope or target-environment proof is incomplete.
- `Designed to support`: architecture is aligned, but implementation, evidence, or approval remains pending.
- `Not available`: do not sell or promise the capability.

## Public Trust Center readiness

| Item | Status to confirm | Evidence location |
| --- | --- | --- |
| Public Trust Center route exists | Complete before customer disclosure | `src/app/[locale]/trust/page.tsx` |
| Public security route exists | Complete before customer disclosure | `src/app/[locale]/security/page.tsx` |
| Footer links to trust and security pages | Complete before customer disclosure | `src/components/marketing/public-footer.tsx` |
| Landing page links to Trust Center | Complete before customer disclosure | `src/components/marketing/enterprise-home.tsx` |
| Pricing page links to Trust Center | Complete before customer disclosure | `src/app/[locale]/pricing/page.tsx` |

## Security and architecture review

| Review area | Buyer question | Evidence location | Safe answer boundary |
| --- | --- | --- | --- |
| Authentication | How are users authenticated? | `docs/trust/ACCESS_CONTROL.md`, `src/middleware.ts` | Supabase Auth and server-side session checks are implemented. |
| RBAC | Which roles and permissions exist? | `src/server/security/rbac.ts` | Owner, admin, editor, member, and viewer exist in the Trust Center RBAC model; legacy paths must be scoped honestly. |
| RLS | How is tenant isolation handled? | `supabase/migrations/*`, RLS evidence docs | Designed to support database tenant boundaries; live target evidence must be attached for production claims. |
| Audit logs | Are critical actions recorded? | `src/lib/security/audit-log.ts`, `src/server/queries/audit-events.ts` | Audit event code paths exist; retention and external immutability require separate evidence. |
| Audit chain | Is audit integrity supported? | `src/server/security/audit-chain.ts` | Hash-chain integrity exists; do not call it WORM-backed or externally immutable. |
| Encryption in transit | Is traffic encrypted? | `docs/trust/ENCRYPTION.md`, provider evidence | Designed to use HTTPS/TLS through managed providers; verify target deployment. |
| Sensitive configuration | How are privileged runtime settings handled? | `src/lib/supabase/admin.ts`, security scripts | Intended to remain server-side and outside browser-delivered bundles. |
| Backups | Are backups and restores tested? | `docs/trust/BACKUP_AND_RECOVERY.md` | Provider-managed posture; do not promise tested restore, RTO, or RPO without evidence. |
| Incident response | What happens during a security issue? | `docs/trust/INCIDENT_RESPONSE.md`, `SECURITY.md` | Documented workflow exists; 24/7 staffed monitoring is not currently claimed. |
| Subprocessors | Which providers may process data? | `docs/trust/SUBPROCESSORS.md` | Register must be verified before contractual disclosure. |
| Data retention | How long is data kept? | `docs/trust/DATA_PROTECTION.md` | Formal retention schedule remains agreement-dependent. |
| Responsible disclosure | How are reports submitted? | `SECURITY.md` | Reports go privately to `renansilva2002@gmail.com` until a dedicated mailbox exists. |

## Compliance claim guardrails

Do not claim any of the following unless approved evidence is attached:

- SOC 2 Type I or Type II report;
- ISO 27001 certification;
- completed third-party penetration test;
- GDPR compliance as a legal conclusion;
- end-to-end encryption;
- immutable or WORM-backed audit logs;
- tested disaster recovery;
- contractual RTO/RPO;
- 24/7 staffed monitoring.

Use this safer structure instead:

> Risck comply is designed to support enterprise security review through authenticated workspaces, organization-scoped RBAC, Supabase RLS migrations, audit events, managed-provider safeguards, subprocessors review, data-retention review, incident-response workflow, and release evidence gates. Current certifications and external assurance artifacts are disclosed separately.

## Buyer packet to attach

Attach the following files during procurement review:

1. `docs/trust/SECURITY_OVERVIEW.md`
2. `docs/trust/ARCHITECTURE_OVERVIEW.md`
3. `docs/trust/DATA_PROTECTION.md`
4. `docs/trust/ACCESS_CONTROL.md`
5. `docs/trust/ENCRYPTION.md`
6. `docs/trust/INCIDENT_RESPONSE.md`
7. `docs/trust/BACKUP_AND_RECOVERY.md`
8. `docs/trust/SUBPROCESSORS.md`
9. `docs/trust/SECURITY_FAQ.md`
10. `docs/trust/ENTERPRISE_PROCUREMENT_PACKET.md`
11. `docs/trust/PROCUREMENT_CHECKLIST.md`
12. `SECURITY.md`
13. `docs/RELEASE_EVIDENCE_CHECKLIST.md`

## Final buyer-readiness gate

Before an enterprise deal is marked procurement-ready, confirm:

- all mandatory trust docs exist;
- public Trust Center and Security pages render;
- footer, landing, and pricing surfaces link to the Trust Center;
- the Trust Center package check passes;
- the Vitest trust-documentation test passes;
- release evidence records current blockers honestly;
- no sales or marketing page claims unsupported certification, penetration test, disaster recovery, or monitoring maturity.
