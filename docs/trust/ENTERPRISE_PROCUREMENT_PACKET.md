# Enterprise procurement packet

Status: `INTERNAL_PACKET_READY / EXTERNAL_ACCEPTANCE_OPEN`. Buyer-facing checklist and answer bank for enterprise review. This packet is not a certification report, legal opinion, DPA, or third-party assurance report.

## Procurement checklist

See `docs/trust/PROCUREMENT_CHECKLIST.md` for the current working checklist. Confirm the public Trust Center, current release evidence, provider facts, data-handling boundaries, service commitments, and responsible contact before sharing enterprise answers.

Provider and configuration facts are tracked in `docs/trust/PROVIDER_FACTUAL_EVIDENCE_REGISTER.md`; the current release overlay is `docs/trust/evidence/2026-09-09-provider-current-overlay.md`. Stale release-specific facts must not be promoted into customer disclosures.

## Operator context

Owner-supplied current review facts identify the proposed contracting/legal entity as **SAMUEL CERQUEIRA, UNIPESSOAL LDA**, operating the **RISCK COMPLY** brand and `https://www.risckcomply.com`. Registry/tax identifiers and any legally material contracting details remain subject to the legal-review and authoritative-evidence gates before final contract execution.

## Current evidence boundary

This buyer-facing packet does not independently declare any Git SHA, Production deployment, health result, readiness result, or provider-account fact as current. Release-dependent claims must come from the latest accepted and attributable evidence in `docs/trust/PROVIDER_FACTUAL_EVIDENCE_REGISTER.md`, its current overlay, and the canonical Enterprise release trackers. If those sources are behind the active deployment or exact-main acceptance is incomplete, the release-specific claim remains `OPEN`.

Current technical implementation and procurement documentation are sufficient for structured internal/buyer due-diligence preparation. They do **not** complete qualified legal review, independent external assurance, VAT/tax treatment, a legitimate LIVE paid-customer lifecycle, exact-SHA Production acceptance, or final customer procurement acceptance.

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
- `docs/trust/PROVIDER_FACTUAL_EVIDENCE_REGISTER.md`
- `docs/trust/evidence/2026-09-09-provider-current-overlay.md`

## Current terminal blockers to disclose when material

- qualified EU AI Act/legal assurance: `0/8` accepted;
- Portuguese VAT/tax treatment: attributable seller fact remains open;
- independent pentest: application submitted, selection/testing pending;
- retest: not started;
- legitimate LIVE paid-customer authority: no qualifying customer lifecycle observed under the exact billing-authority contract;
- exact-current-main Production acceptance: open while canonical Production remains on an older release and the protected runtime gate has not completed.

These blockers do not erase truthful implementation evidence. They do prohibit representing RISCK COMPLY as fully externally assured, legally approved, independently pentested, tax-final, or terminal Enterprise-ready.

## External assurance boundary

Only completed, attributable and accepted evidence may be referenced as complete. Repository preparation, CI, templates, generated evidence, internal checks, provider configuration, platform-proof fixtures or owner-authored drafts must not be described as independent external acceptance.

Open dependencies remain tracked in the canonical External Assurance and Enterprise closure issues. Their existence does not invalidate truthful technical evidence, but it prohibits unsupported claims of full external assurance or final Production approval.

## Responsible contact

The current reachable corporate contact is `comercial@risckcomply.com`. A dedicated security alias is not represented as active until its external delivery is re-verified.

## Public incident communication

The canonical public incident-communication authority is `https://risckcomplystatus1.statuspage.io/`. This public status channel is separate from private contact and does not create a standalone contractual availability commitment.
