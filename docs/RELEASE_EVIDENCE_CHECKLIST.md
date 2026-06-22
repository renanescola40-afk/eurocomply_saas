# Release Evidence Checklist

This checklist defines the evidence package that must be attached to a EuroComply release before promoting it beyond private beta. It complements `docs/RELEASE_CANDIDATE_VALIDATION.md` by focusing on artifacts that cannot be proven by static source checks alone.

## Release identity

Record release version or tag, commit SHA, deployment target, deployment URL, release owner, approval date, rollback owner and customer communication owner.

## Build and CI evidence

Attach CI run URL or logs, build output, deployment evidence, release approval note and confirmation that no required gate was skipped.

## Production environment evidence

Attach provider configuration evidence with values redacted, owner confirmation that sensitive settings are provider-managed, and smoke-test output for release-critical operational routes.

## Supply-chain evidence

Attach lockfile evidence, deterministic install output, dependency audit output, triage notes and approved exception records.

## Supabase and RLS evidence

Attach live RLS validation output, project identifier, tenant-isolation review notes and confirmation that service-role paths were reviewed separately from user-session paths.

## Audit and authorization evidence

Attach evidence that critical authorization paths, role checks, audit event creation and audit listing are working in the target environment.

## Billing evidence

Attach checkout, portal and webhook validation evidence for the target environment. Billing changes should produce audit events and respect organization permissions.

## Trust Center readiness

Attach evidence that the public Trust Center and Security pages exist, footer and commercial routes link to Trust Center material, critical docs exist in `docs/trust/`, responsible disclosure contact is present, and `npm run security:trust-package` passes.

Required Trust Center artifacts:

- `docs/trust/SECURITY_OVERVIEW.md`
- `docs/trust/ARCHITECTURE_OVERVIEW.md`
- `docs/trust/DATA_PROTECTION.md`
- `docs/trust/ACCESS_CONTROL.md`
- `docs/trust/ENCRYPTION.md`
- `docs/trust/INCIDENT_RESPONSE.md`
- `docs/trust/BACKUP_AND_RECOVERY.md`
- `docs/trust/SUBPROCESSORS.md`
- `docs/trust/SECURITY_FAQ.md`
- `docs/trust/ENTERPRISE_PROCUREMENT_PACKET.md`

## Claims guardrail evidence

Before release, confirm public pages and sales/procurement documents do not claim unavailable certifications, completed external reviews, tested disaster recovery, guaranteed RTO/RPO, 24/7 staffed monitoring, or other evidence-dependent controls. Use `designed to support` when a control is planned or requires customer/provider evidence.

## Customer communication evidence

Attach customer communication owner, support owner, status-page decision and reviewer sign-off for security, privacy, billing, data integrity and incident communications.

## Release decision

A release may be promoted only when every required evidence section is complete, not applicable to the target release tier, or explicitly accepted as a documented risk by the release owner. Enterprise procurement should not accept exceptions for Trust Center readiness, supply-chain triage, live RLS validation, authorization, audit evidence, billing correctness or customer communication ownership.
