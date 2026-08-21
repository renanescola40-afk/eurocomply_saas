# Enterprise procurement packet

Status: buyer-facing checklist and answer bank for enterprise review. This packet is not a certification report, legal opinion, DPA, or third-party security report.

## Procurement checklist

See `docs/trust/PROCUREMENT_CHECKLIST.md` for the current working checklist. Confirm public Trust Center routes, footer links, landing links, pricing links, release evidence, subprocessors, data retention boundaries, incident response workflow, backup evidence, and responsible disclosure contact before sharing enterprise answers.

Provider/configuration facts and unresolved account-level DPA/region/retention fields are tracked separately in the internal supporting assurance evidence at `docs/trust/PROVIDER_FACTUAL_EVIDENCE_REGISTER.md` so draft provider rows are not accidentally presented as approved contractual disclosures.

## Current technical public-surface evidence

The most recent External Assurance connector observation is recorded in `docs/trust/evidence/2026-08-21-external-assurance-runtime-provider-revalidation.md`.

For production release subject `b54afdfd6370442e7c7924f31d6210841621cf38`, connected Vercel evidence observed the target-production deployment as `READY`; `/pt/trust`, `/pt/security`, and `/pt/status` returned HTTP `200`, and the served HTML exposed Sentry production release binding to the same SHA. Connected Supabase evidence also revalidated production project `tganhbbhfxcpblmgqprg` as `ACTIVE_HEALTHY` in `eu-west-1`.

This resolves the former technical public-route defect tracked in `#1739` for the observed release only. Revalidate before describing a newer release as current. This evidence does **not** complete founder facts, qualified legal review, GDPR legal assurance, independent penetration testing, provider contracts/DPAs, or final subprocessor approval.

## Approved positioning

Risck comply is designed to support enterprise security review through authenticated workspaces, organization-scoped access, tenant-isolation controls, audit events, controlled documentation, managed-provider safeguards, subprocessor review, and release evidence gates.

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

`docs/trust/PROVIDER_FACTUAL_EVIDENCE_REGISTER.md` and `docs/trust/evidence/2026-08-21-external-assurance-runtime-provider-revalidation.md` are internal evidence-working artifacts, not buyer-facing core artifacts. They exist to support factual reconciliation and prevent draft provider/account facts from being promoted into customer disclosures before the applicable account evidence and legal review are complete.

## External assurance boundary

The procurement packet may reference completed, attributable external evidence when it exists. It must not infer external assurance from repository preparation, CI, templates, generated evidence JSON, internal DAST, or provider configuration.

Before describing external assurance as complete, verify the canonical External Assurance trackers and accepted source artifacts. At this snapshot:

- founder facts are not yet an accepted signed record and the legal entity is not registered;
- qualified legal review has not reached 8/8 decisions or a master legal decision;
- independent penetration testing has not been completed;
- Privacy/GDPR/subprocessor factual and legal closure remains in review.

These blockers do not invalidate truthful technical/product evidence, but they prohibit claims that qualified legal assurance, independent pentesting, final GDPR legal assurance, or full external procurement assurance is already complete.

## Guardrail

Use `designed to support` for planned or evidence-dependent capabilities. Do not present planned items as completed. Do not claim SOC 2, ISO 27001, completed third-party penetration testing, tested recovery, 24/7 monitoring, guaranteed EU AI Act compliance, or GDPR compliance as a legal conclusion unless the specific claim has approved current evidence.

Provider certifications or compliance attestations belong to the provider's own assurance boundary and must not be presented as RISCK COMPLY certifications.

## Responsible disclosure

Security reports should be sent privately to `security@risckcomply.com`. The dedicated corporate security channel has verified external delivery and authorized-owner monitoring.

## Public incident communication

The canonical public incident-communication authority is `https://risckcomplystatus1.statuspage.io/`. This public status channel is separate from private security disclosure and does not itself constitute a contractual uptime SLA.
