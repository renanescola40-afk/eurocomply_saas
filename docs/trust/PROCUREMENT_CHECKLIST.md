# Enterprise procurement checklist

Status: buyer-facing checklist for enterprise review. This checklist helps a buyer evaluate RISCK COMPLY without requiring unsupported compliance claims. It is not a certification report, legal opinion, DPA, or security audit.

## How to use this checklist

Use this checklist before answering an enterprise questionnaire, signing a security schedule, or making a sales claim about security, privacy, resilience, AI governance, or compliance posture.

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
| Demo page captures enterprise readiness leads | Complete before launch | `src/app/[locale]/book-demo/page.tsx`, `src/app/api/leads/route.ts` |
| Private security contact | Complete only while the published mailbox is externally reachable | `SECURITY.md`, `src/lib/trust-center/verified-authority.ts` |
| Dedicated security alias | Not available until external delivery is re-verified | operational mail configuration evidence |
| Public incident-communication authority | Complete after controlled public incident create/update/resolve proof | `src/app/[locale]/status/page.tsx`, `src/lib/trust-center/verified-authority.ts` |

## AI governance procurement packet

| Review area | Buyer question | Evidence location | Safe answer boundary |
| --- | --- | --- | --- |
| AI inventory | Can you show where AI is used and who owns each system? | Product workspace and dashboard evidence | Position as operational inventory support, not legal classification approval. |
| Risk classification | How do you classify AI system risk? | Product risk workflow and assessment records | Say RISCK COMPLY structures risk signals and evidence; final legal interpretation remains with the customer/advisors. |
| Policy workflow | Can policies be linked to real AI systems? | Policy/document features | Position as workflow support, not legal advice. |
| Evidence packs | Can you prepare audit/procurement evidence? | Evidence pack docs and exports | Position as audit preparation support, not certification or regulator approval. |
| Owners and accountability | Can every AI system have a responsible owner? | Organization/workspace ownership model | State only the supported implementation scope. |
| Buyer reviews | Can this help answer customer security/procurement questions? | Trust Center and procurement packet | Use current evidence only; do not claim unsupported certifications. |

## Security and architecture review

| Review area | Buyer question | Evidence location | Safe answer boundary |
| --- | --- | --- | --- |
| Authentication | How are users authenticated? | `docs/trust/ACCESS_CONTROL.md`, `src/middleware.ts` | Supabase Auth and server-side session checks are implemented where current evidence supports them. |
| RBAC | Which roles and permissions exist? | `src/server/security/rbac.ts` | Owner, admin, editor, member, and viewer exist in the Trust Center RBAC model; legacy paths must be scoped honestly. |
| RLS | How is tenant isolation handled? | `supabase/migrations/*`, RLS evidence docs | Designed to support database tenant boundaries; live target evidence must be attached for Production claims. |
| Audit logs | Are critical actions recorded? | `src/lib/security/audit-log.ts`, `src/server/queries/audit-events.ts` | Audit event code paths exist; retention and external immutability require separate evidence. |
| Encryption in transit | Is traffic encrypted? | `docs/trust/ENCRYPTION.md`, provider evidence | Designed to use HTTPS/TLS through managed providers; verify target deployment. |
| Backups | Are backups and restores tested? | `docs/trust/BACKUP_AND_RECOVERY.md` | Provider-managed posture; do not promise tested restore, RTO, or RPO without evidence. |
| Incident response | What happens during a security issue? | `docs/trust/INCIDENT_RESPONSE.md`, `SECURITY.md` | Documented workflow exists; 24/7 staffed monitoring is not currently claimed. |
| Subprocessors | Which providers may process data? | `docs/trust/SUBPROCESSORS.md` | Register must be verified before contractual disclosure. |
| Data retention | How long is data kept? | `docs/trust/DATA_PROTECTION.md` | Formal retention schedule remains agreement-dependent. |
| Responsible disclosure | How are reports submitted? | `SECURITY.md` | Reports currently go privately to the reachable corporate mailbox `comercial@risckcomply.com`; no dedicated security alias is claimed until delivery is re-verified. |

## Compliance claim guardrails

Do not claim any of the following unless approved evidence is attached:

- guaranteed EU AI Act compliance;
- replacement for lawyers, DPOs, auditors or legal counsel;
- SOC 2 Type I or Type II report status;
- ISO 27001 certification;
- completed third-party penetration test status;
- GDPR compliance as a legal conclusion;
- end-to-end encryption;
- immutable or WORM-backed audit logs;
- tested disaster recovery;
- contractual RTO/RPO;
- 24/7 staffed monitoring.

Use this safer structure instead:

> RISCK COMPLY is designed to support enterprise AI governance readiness through AI inventory, owner assignment, risk workflow, policy/evidence records, authenticated workspaces, organization-scoped RBAC, Supabase RLS migrations, audit events, managed-provider safeguards, subprocessors review, data-retention review, incident-response workflow, and release evidence gates. Current certifications and external assurance artifacts are disclosed separately.

## Buyer packet to attach

Attach the applicable current files from `docs/trust/`, `SECURITY.md`, and the release evidence checklist. Before sharing, bind release-dependent evidence to the current protected release candidate and remove stale release references.

## Final buyer-readiness gate

Before an enterprise deal is marked procurement-ready, confirm:

- all mandatory trust docs exist;
- public Trust Center and Security pages render;
- the current responsible disclosure authority is `comercial@risckcomply.com` and does not fall back to a personal/free-mail account;
- no dedicated security alias is claimed active without successful external-delivery evidence;
- the canonical public incident authority remains `https://risckcomplystatus1.statuspage.io/`;
- AI governance claims are framed as readiness/evidence support, not legal guarantees;
- `npm run security:trust-package` passes;
- release evidence records current blockers honestly;
- no sales or marketing page claims unsupported certification, penetration test, disaster recovery, monitoring maturity, or legal compliance guarantees.
