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

Attach evidence for:

- Customer communication owner assigned
- Status page owner assigned or explicit exception recorded
- Support owner assigned
- Support macros or response guidance prepared
- Security/compliance reviewer assigned for security, privacy, audit-chain, RLS, authorization, billing, or data integrity communications
- SEV-1 and SEV-2 communication timing targets acknowledged
- Customer communication plan reviewed before Go/No-Go

Accepted evidence:

- Completed `docs/RELEASE_CUSTOMER_COMMUNICATION_PLAN.md` review note
- Release approval record naming the customer communication owner
- Status page decision
- Support readiness note
- Customer notice draft, if applicable
- Post-incident customer summary decision, if applicable

## External review evidence

For public production or enterprise procurement, attach evidence for:

- External security review or pentest completed, or a clear deferral is disclosed for non-enterprise release only
- Scope confirms auth, RBAC, tenant isolation, APIs, uploads, billing, audit chain, exports, GDPR delete, rate limiting, and webhooks
- Test environment used seed data tenant A/B, accounts by role, Stripe test mode, Supabase test project, and scanner mock/real according to environment
- Critical findings resolved or formally accepted
- High findings resolved or formally accepted
- Retest evidence attached where applicable
- No critical finding has pending, failed, or missing retest evidence for enterprise release

Accepted evidence:

- `docs/security/PENTEST_SCOPE.md`
- `docs/security/PRE_PENTEST_CHECKLIST.md`
- `docs/security/PENTEST_FINDINGS_TRIAGE.md`
- `docs/security/PENTEST_RETEST_RECORD.md`
- `docs/security/evidence/runtime/external-security-review-or-pentest.json`
- Pentest report when available
- External review report when available
- Finding triage spreadsheet or markdown record
- Retest confirmation
- Risk acceptance sign-off
- Customer-safe disclosure if external review has not been completed

Enterprise evidence must pass:

```bash
npm run release:enterprise-readiness
```

The placeholder JSON is not evidence of completion and must remain `Open` until a real report exists.

## Release decision

A release may be promoted only when every required evidence section is either:

- Complete
- Not applicable to the target release tier
- Explicitly accepted as a documented risk by the release owner

Private beta may accept more documented exceptions.

Public production should not accept exceptions for build, CI, RLS, audit-chain integrity, billing correctness, customer communication ownership, or Trust Center claim accuracy.

Enterprise release should not accept exceptions for missing external security review evidence, unresolved critical/high findings, or pending critical retests.
