# Enterprise procurement packet

Status: buyer-facing checklist and answer bank for enterprise review. This packet is not a certification report, legal opinion, DPA, or third-party security report.

## Procurement checklist

See `docs/trust/PROCUREMENT_CHECKLIST.md` for the current working checklist. Confirm public Trust Center routes, footer links, landing links, pricing links, release evidence, subprocessors, data retention boundaries, incident response workflow, backup evidence, and responsible disclosure contact before sharing enterprise answers.

Provider/configuration facts and unresolved account-level DPA/region/retention fields are tracked separately in the internal supporting assurance evidence at `docs/trust/PROVIDER_FACTUAL_EVIDENCE_REGISTER.md` so draft provider rows are not accidentally presented as approved contractual disclosures.

## Current technical public-surface evidence

Current release coordination is bound to protected `main` at `93e4672b7c0144f1b018599bb8fb4bb9cdcf0fab`. Connected Vercel evidence observed the Production deployment as READY on that exact SHA; `/api/health` returned HTTP 200 and anonymous `/api/ready` failed closed with HTTP 401. This exact release remains subject to the external legal, pentest, provider-account, Supabase Production-promotion and genuine Stripe LIVE lifecycle blockers tracked in the canonical Enterprise issues.

This evidence does **not** complete founder facts, qualified legal review, GDPR legal assurance, independent penetration testing, provider contracts/DPAs, Supabase V19 Production promotion or final subprocessor approval.

## Approved positioning

RISCK COMPLY is designed to support enterprise security review through authenticated workspaces, organization-scoped access, tenant-isolation controls, audit events, controlled documentation, managed-provider safeguards, subprocessor review, and release evidence gates.

## Core buyer-facing materials

- `docs/trust/SECURITY_OVERVIEW.md`
- `docs/trust/ARCHITECTURE_OVERVIEW.md`
- `docs/trust/DATA_PROTECTION.md`
- `docs/trust/ACCESS_CONTROL.md`
- `docs/trust/ENCRYPTION.md`
- `docs/trust/INCIDENT_RESPONSE.md`
- `docs/trust/BACKUP_AND_RECOVERY.md`
- `docs/trust/SUBPROCESSORS.md`
- `docs/trust/SECURITY_FAQ.md`
- `docs/trust/PROCUREMENT_CHECKLIST.md`

## Internal supporting assurance evidence

`docs/trust/PROVIDER_FACTUAL_EVIDENCE_REGISTER.md` and the canonical External Assurance trackers are internal evidence-working artifacts, not buyer-facing core artifacts. They exist to support factual reconciliation and prevent draft provider/account facts from being promoted into customer disclosures before the applicable account evidence and legal review are complete.

## External assurance boundary

The procurement packet may reference completed, attributable external evidence when it exists. It must not infer external assurance from repository preparation, CI, templates, generated evidence JSON, internal DAST, or provider configuration.

Before describing external assurance as complete, verify the canonical External Assurance trackers and accepted source artifacts. At this snapshot:

- founder facts and the attributable legal-identity/corporate factual record are not yet accepted as a signed release-bound artifact;
- qualified legal review has not reached 8/8 decisions or a master legal decision;
- independent penetration testing has not been completed;
- Privacy/GDPR/subprocessor factual and legal closure remains in review;
- Supabase governed V19 Production promotion remains separately protected;
- the genuine Stripe LIVE customer lifecycle has not yet occurred.

These blockers do not invalidate truthful technical/product evidence, but they prohibit claims that qualified legal assurance, independent pentesting, final GDPR legal assurance, or full external procurement assurance is already complete.

## Guardrail

Use `designed to support` for planned or evidence-dependent capabilities. Do not present planned items as completed. Do not claim SOC 2, ISO 27001, completed third-party penetration testing, tested recovery, 24/7 monitoring, guaranteed EU AI Act compliance, or GDPR compliance as a legal conclusion unless the specific claim has approved current evidence.

Provider certifications or compliance attestations belong to the provider's own assurance boundary and must not be presented as RISCK COMPLY certifications.

## Responsible disclosure

Security reports should currently be sent privately to `comercial@risckcomply.com`. This is the reachable corporate intake path while a dedicated security alias is re-verified for external delivery.

## Public incident communication

The canonical public incident-communication authority is `https://risckcomplystatus1.statuspage.io/`. This public status channel is separate from private security disclosure and does not itself constitute a contractual uptime SLA.
