# Enterprise Trust Evidence Manifest

Status: internal evidence control.
Last updated: 2026-06-13.

This directory tracks EuroComply's enterprise security and compliance claims in a structured, reviewable format.

## Primary artifact

- `enterprise-trust-evidence.json`

This JSON manifest is the source of truth for due-diligence answers such as ISO 27001, SOC 2, pentest, SSO/SAML, MFA, exportable logs, tenant isolation, disaster recovery, backup restore, DPA, subprocessors, SLA, monitoring, retention, granular permissions, and immutable audit trails.

## Status values

Allowed status values are:

- `not_available` — do not claim this control exists.
- `planned` — roadmap item only; do not claim availability.
- `draft` — document exists but is not approved/customer-ready.
- `partial` — some internal implementation or evidence exists, but not enough for an enterprise claim.
- `partial_strong` — substantial technical control exists, but still needs external proof, production evidence, or customer-facing process.
- `available` — implemented and internally evidenced.
- `externally_validated` — externally audited/validated and linked to external evidence.

## Customer response rule

Never answer `yes` to a customer security questionnaire from memory. Use `enterprise-trust-evidence.json` and only answer `yes` when:

1. `status` is `available` or `externally_validated`.
2. Evidence paths are present and current.
3. Legal/security owner has approved the answer.
4. For ISO 27001, SOC 2, and pentest claims, external evidence is attached under an external evidence path.

## Guard rails

The manifest is checked by:

```bash
npm run security:trust-evidence
```

The full trust package is checked by:

```bash
npm run security:trust-package
```

Both commands are included in `npm run security:ci`.

## Updating the manifest

When changing a claim:

1. Update the `status`.
2. Add or remove evidence paths.
3. Update blockers and next actions.
4. Ensure the customer answer does not over-claim.
5. Run `npm run security:trust-evidence` and `npm run security:trust-package`.

Do not mark a certification, external audit, or pentest claim as `externally_validated` unless the external report or attestation path is present and approved for use.
