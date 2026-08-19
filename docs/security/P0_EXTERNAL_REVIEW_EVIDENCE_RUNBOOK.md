# P0 External Security Review Evidence Runbook

This runbook closes the `external-security-review-or-pentest` P0 evidence item only after a **real independent external security review or penetration test** is attributable, authorized, exact-release bound, documented, triaged and retested as required.

A proposal, quotation, provider scoping reply, internal CI/DAST/SAST result, repository template, AI analysis or provider self-test is preparation only and earns zero independent-assurance credit.

## Closure paths

Acceptable non-enterprise closure paths:

- External penetration test completed with attributable provider/tester evidence, findings triaged and required closure/retest evidence retained.
- External security review completed with equivalent independent-assurance evidence.
- Formal private-beta exception approved with owner, rationale, compensating controls and expiry date.

Enterprise release has a stricter rule: `Exception` is not sufficient. Enterprise release requires `status: Complete` under schema `risck-comply.external-security-assurance.v2` and the canonical acceptance contract enforced by `scripts/security/external-security-assurance-contract.mjs`.

## Required independent assessor evidence

Before `Complete`, retain without publishing confidential details:

- contracting provider legal entity;
- testing-delivery entity/team;
- relevant application/API/cloud-security competence, qualification or accreditation basis;
- durable accreditation/qualification reference where applicable;
- attributable lead tester or responsible assessor;
- independence declaration;
- conflict assessment.

Provider branding alone is not qualification evidence. Where an accreditation listing uses a legacy or different legal name, the engagement evidence must reconcile the contracting/testing entity to the applicable qualification rather than infer equivalence.

## Authorization and rules of engagement

Retain:

- NDA reference;
- rules-of-engagement reference;
- authorised RISCK COMPLY testing owner;
- authorization timestamp;
- completed testing window start/end;
- emergency/contact and prohibited-action terms in the private ROE as appropriate.

Do not treat vendor interest or a proposal as authorization to test production.

## Exact tested release binding

Enterprise credit requires the evidence to bind:

- exact tested/retested `productSha`;
- exact deployment identifier;
- tested environment(s);
- tested hostname(s).

The final external-assurance checker resolves the expected release SHA from `EXTERNAL_ASSURANCE_EXPECTED_SHA`, `GITHUB_HEAD_SHA`, `GITHUB_SHA`, or local Git and rejects a `Complete` record whose tested SHA does not match.

If remediation materially changes the release, the required retest/final external evidence must bind the resulting release accepted for launch rather than silently inheriting credit from the pre-fix build.

## Required scope coverage

Use `docs/security/PENTEST_SCOPE.md` as the source of truth. Enterprise external-assurance scope must include all canonical controls:

- auth;
- RBAC;
- tenant isolation;
- APIs;
- BOLA/IDOR;
- uploads;
- malware scanner;
- billing Stripe;
- webhooks;
- audit chain;
- exports;
- GDPR delete;
- rate limiting;
- observability;
- secrets.

Use `docs/security/PRE_PENTEST_CHECKLIST.md` to prepare the safe test environment before sharing access with reviewers.

## Report integrity

A `Complete` record requires:

- real report date;
- durable private/redacted report reference;
- approved private storage location;
- SHA-256 digest of the retained report artifact;
- methodology;
- durable executive-summary reference;
- independent review metadata and review timestamp.

Do not commit confidential report bodies, exploit payloads, credentials, customer data or sensitive topology. Retain only safe references/digests and redacted summary metadata in the repository.

## Finding and retest rules

Every finding must have a unique ID, severity, owner, due date, mitigation/disposition, status, retest status and a safe evidence reference.

For **High and Critical** findings, final enterprise credit additionally requires a matching retest record with:

- retest date;
- retest disposition matching the finding;
- attributable external retester/assessor;
- durable redacted/private retest evidence reference.

A resolved High/Critical requires `passed` retest. A documented false positive may use the canonical false-positive disposition. A formally accepted High/Critical risk must include attributable approver, acceptance/expiry dates, rationale, customer impact and compensating controls, and must use the canonical formal-acceptance retest disposition. Expired risk acceptance never closes the finding.

Finding summary counts must exactly match the canonical `findings` array. Duplicated finding IDs or silent High/Critical omissions fail closed.

## Fill the JSON evidence file

For preparation, the repository may keep `docs/security/evidence/runtime/external-security-review-or-pentest.json` as an `Open` placeholder. That placeholder is intentionally not proof of completion.

After a real review exists, start from:

```text
docs/security/evidence/templates/external-security-review-or-pentest.template.json
```

and replace every placeholder with genuine reviewed evidence. Keep the final runtime evidence at:

```text
docs/security/evidence/runtime/external-security-review-or-pentest.json
```

The file is only enterprise-valid when both external-review checkers accept the same canonical contract.

## Required commands

Run the state-aware P0 checker:

```bash
node scripts/security/check-p0-external-review-evidence.mjs --enterprise
```

Run the strict independent-assurance checker:

```bash
npm run security:external-review
```

Run the enterprise release gate before enterprise approval:

```bash
npm run release:enterprise-readiness
```

These commands must fail for enterprise while the runtime JSON remains `Open`, uses an `Exception`, references only placeholder/provider-scoping evidence, lacks exact-SHA binding, lacks independent qualification/authorization/report integrity, or has unresolved High/Critical closure/retest gaps.

## Go/no-go

Do not mark this P0 item `Complete` unless an actual independent external review/pentest has completed and every required evidence condition above is satisfied.

If the app remains private beta, use `Exception` only when the release owner explicitly approves the risk and expiry date. Do not use `Exception` for enterprise release.
