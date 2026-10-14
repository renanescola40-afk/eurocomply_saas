# RISCK COMPLY — DataGuard Security Evidence V1.4: External Assurance Reconciliation

Review date: 2026-10-14. Method: read-only repository source/documentation inspection. Production/demo unchanged. This is a reconciliation, not independent certification.

## Material correction to earlier assessments

`docs/trust/SECURITY_OVERVIEW.md` documents a third-party black-box assessment completed 2026-09-12 and an attributable confidential report received. It also says original TLS 1.0/1.1 High findings received subsequent technical remediation and external validation evidence. **Do not erase or understate that historical assessment.** However it expressly says clean independent terminal retest and authenticated tenant-isolation assurance remain open.

The canonical runtime evidence tracker `docs/security/evidence/runtime/external-security-review-or-pentest.json` remains `status: Open`, `outcome: not_started`, with `placeholderOnly: true` and `realExternalReportAttached: false`. This tracker conflicts with a blanket interpretation of the dated historical assessment as the full final pentest. The correct reconciliation is *historical limited external assessment documented; terminal procurement-grade assurance unaccepted; canonical evidence not populated*. The tracker label 'not_started' is not proof no historical assessment ever occurred.

`DATAGUARD_DATA_ROOM/03_SECURITY/SECURITY_ASSURANCE_DISCLOSURE.md` supports the same qualified position. `docs/security/pentest/evidence-requirements.md` documents the 15 required domains, exact release, assessor attribution, finding-by-finding retest and independent closure requirements.

## Initial eight-control coverage accounting

1. Privileged Supabase client: source inspected.
2. Public secrets guard: source inspected.
3. API taxonomy/inventory: source inspected.
4. RLS/tenant enforcement: checker source inspected; target runtime unverified.
5. MFA/step-up: checker source inspected; target runtime unverified.
6. Incident response: playbook inspected; operational exercises unverified.
7. External independent assurance: trust disclosure, pentest evidence criteria and canonical Open evidence inspected; terminal acceptance OPEN.
8. Audit integrity: checker source inspected; runtime proof not established.

**8/8 = 100% initial control-category reference mapping.** **0 additional runtime control validations performed in this review**. The initial eight-item reference mapping is finished, but the complete internal security audit is NOT 100% and cannot be measured responsibly from this mapping. Independent assessment terminal acceptance remains OPEN. Never describe 100% reference mapping as 100% secure, production GO or buyer acceptance.

## Outstanding and next verifiable steps

- Reconcile confidential 2026-09-12 assessor/report attribution, scope, dated TLS retest and exact target SHA in approved access-controlled evidence, without publishing confidential material.
- Inspect each high-risk service-role caller and negative tenant authorization tests.
- Validate RLS policy/migration effectiveness only in an isolated non-production test project.
- Verify audit-chain and step-up runtime artifacts for exact SHA, environment and expiry.
- Obtain final external assessment, complete 15-domain coverage, findings triage and independent retest accepted for the applicable release.
- Record explicit buyer acceptance separately, if and when given.

## Guardrails

No production active testing or mutations, no changes to production Auth/RLS, no Stripe LIVE updates, no deployments, no main merge, no external messages, and no claim of certification.
