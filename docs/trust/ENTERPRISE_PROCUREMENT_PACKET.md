# Enterprise procurement packet

Status: `INTERNAL_PACKET_READY / EXTERNAL_ACCEPTANCE_OPEN`. Buyer-facing checklist and answer bank for enterprise review. This packet is not a certification report, legal opinion, DPA, tax opinion, or clean third-party security attestation.

Last factual reconciliation: `2026-09-24`.

## Procurement checklist

See `docs/trust/PROCUREMENT_CHECKLIST.md` for the working checklist and `docs/trust/FINAL_DATA_ROOM_INDEX_2026-09-12.md` for the controlled data-room index. Confirm the public Trust Center, current release evidence, provider facts, data-handling boundaries, service commitments and responsible contact immediately before sharing enterprise answers.

Provider and configuration facts are tracked in `docs/trust/PROVIDER_FACTUAL_EVIDENCE_REGISTER.md`; stale release-specific facts must not be promoted into customer disclosures.

## Operator context

The owner has selected **SAMUEL CERQUEIRA, UNIPESSOAL LDA** as the RISCK COMPLY operator/contracting entity for the current legal package. Current authoritative registry/tax evidence and legally material contracting facts must still be reconciled before final contractual publication or signature where those facts are required.

## Current release boundary

Fresh controller evidence shows that protected source and canonical Production are not yet one accepted release lineage. The exact source SHA, Production SHA, deployment identifier and measured drift remain controlled release evidence in `docs/enterprise/ENTERPRISE_CLOSURE_CONTROLLER_V2_2026-09-14.md`, `docs/trust/PROCUREMENT_LEGAL_PRIVACY_CLOSURE_2026-09-24.md` and the canonical provider/evidence register; they are intentionally not hard-coded into this buyer-facing packet.

V43 is now observed as `4/4 APPLIED` in the Production migration ledger, with the reviewed Article 5 / FRIA / atomic DSR runtime objects present and sampled relevant tables showing RLS + FORCE RLS. This materially supersedes the pre-V43 state recorded in the V1 controller. Exact-current-main application acceptance remains separate and open.

Until exact-current-main acceptance is complete, any release-specific claim remains bounded to the release actually evidenced.

A healthy public endpoint does not convert release drift into exact-SHA acceptance.

## Current evidence boundary

Current technical implementation and procurement documentation are sufficient for structured internal/buyer due-diligence preparation. They do **not** complete:

- qualified enterprise legal assurance where a buyer requires it;
- a clean independent security retest/terminal assurance state;
- VAT/tax acceptance;
- a legitimate LIVE paid-customer lifecycle;
- exact-current-main Production acceptance;
- final customer procurement acceptance.

## External security assessment truth

A third-party black-box web application assessment completed on `2026-09-12` and a confidential attributable report was received.

This changes the previous procurement truth: it is no longer correct to say that no third-party security assessment report exists.

The two original High findings concerned acceptance of TLS 1.0 / TLS 1.1 at the edge. Subsequent configuration and external validation evidence supports that those two original Highs are technically remediated: minimum TLS was raised to TLS 1.2, external TLS validation passed the protocol-version check, Qualys SSL Labs evidence was recorded as A+ across assessed endpoints, and DNSSEC was subsequently activated as defense in depth.

However:

- the confidential report must not be published in this public repository;
- a clean Beagle retest is unavailable/pending under the current free-service boundary;
- technical remediation evidence is not the same as a clean independent terminal pentest/retest;
- the assessed Production release is not the current accepted source lineage;
- an unauthenticated black-box assessment does not by itself prove authenticated tenant isolation or satisfy every buyer-required manual security scope.

Safe confidential-artifact reference:

`SHA-256 5a71077f20000047a5d5b3b2865e5ba13760683cf1052a2f0e69326aa37ff281`

Procurement language must therefore be: **external assessment completed; original release-blocking TLS Highs technically remediated; clean retest/terminal independent assurance remains open**. Do not market this as a clean pentest pass.

## Billing and fiscal truth

Current implementation already includes the intended Checkout automatic-tax and tax-ID collection controls. Those controls must not be described as final tax/legal acceptance.

Authoritative company registry and Portuguese VAT-regime/registration facts remain required before final fiscal treatment is represented as closed. Stripe account/tax configuration must be reconciled against those facts rather than changed to make a tracker green.

No synthetic customer, subscription, invoice, payment, VAT ID or tax registration may be created merely for evidence. A legitimate LIVE paid lifecycle remains an external-event gate.

## Legal assurance truth

Owner-controlled commercial decisions are materially advanced: Legal Package V1 is approved and the 12/12 owner decision set is closed.

The repository's `LEGAL_8_OF_8` structure is an internal enterprise-assurance standard, not a literal statutory requirement to obtain eight legal opinions before the SaaS may launch or sell. Absence of 8/8 alone is not an automatic technical or commercial launch blocker.

For the selected strict enterprise-assurance target, current attributable external legal acceptance remains:

- `LEGAL_8_OF_8=0/8_ACCEPTED`;
- `MASTER_LEGAL_OPINION=OPEN_OPTIONAL_ENTERPRISE_ASSURANCE_UNLESS_SPECIFIC_REQUIREMENT_APPLIES`;
- official registry/VAT and certain provider/transfer/role facts remain subject to authoritative or qualified evidence.

Any actually applicable AI Act, GDPR/ePrivacy, company, tax, contractual or conformity obligation remains binding for the affected scope regardless of the internal score.

No owner decision, AI analysis or internal review may be described as qualified external legal approval.

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
- `docs/trust/FINAL_DATA_ROOM_INDEX_2026-09-12.md`
- `docs/trust/PROVIDER_FACTUAL_EVIDENCE_REGISTER.md`
- `docs/trust/PROCUREMENT_LEGAL_PRIVACY_CLOSURE_2026-09-24.md`
- `docs/legal-assurance/INTERNATIONAL_TRANSFER_REGISTER.md`
- `docs/legal-assurance/ROPA.md`
- `docs/legal-assurance/PRIVACY_ART13_14_MATRIX.md`
- `docs/legal-assurance/DPA_ARTICLE_28_CONTROL_MATRIX.md`
- `docs/legal-assurance/CURRENT_LEGAL_AUTHORITY.md`
- `docs/enterprise/ENTERPRISE_CLOSURE_CONTROLLER_V2_2026-09-14.md`

The V1 Enterprise Closure Controller remains historical provenance only and must not be used as the current operational source of truth.

## Legal/privacy buyer-answer boundary

The canonical workstream reconciliation is `docs/trust/PROCUREMENT_LEGAL_PRIVACY_CLOSURE_2026-09-24.md`.

Buyer answers must distinguish:

- DPA Article 28 structure from a final effective signed DPA;
- provider SCC/DPF/adequacy framework evidence from a flow-level Chapter V conclusion;
- category-specific retention/deletion workflows from a universal immediate-erasure promise;
- Supabase Production residency in Ireland from a blanket EU-only processing claim;
- AI Act current-scope applicability documentation from a guarantee of customer compliance; and
- internal procurement readiness from actual buyer/counterparty acceptance.

## Current terminal blockers to disclose when material

- exact-current-main Production acceptance: open while canonical Production remains on an older release;
- exact-SHA authenticated/runtime postconditions and sustained Production proof: open;
- terminal independent security retest/assurance: open where required by the buyer/selected enterprise standard;
- authoritative Portuguese registry and VAT/tax acceptance: open;
- legitimate LIVE paid-customer authority: external-customer dependent and not yet terminally evidenced;
- qualified Legal 8/8 / Master Opinion: open for the selected internal high-assurance enterprise target, while not an automatic general launch prohibition by themselves;
- final buyer/counterparty procurement acceptance: external.

These blockers do not erase truthful implementation evidence. They do prohibit representing RISCK COMPLY as fully externally assured, legally approved, independently clean-pentested, tax-final, or terminal Enterprise 100.

## External assurance boundary

Only completed, attributable and accepted evidence may be referenced as complete. Repository preparation, CI, templates, generated evidence, internal checks, provider configuration, platform-proof fixtures or owner-authored drafts must not be described as independent external acceptance.

## Responsible contact

The current reachable corporate contact is `comercial@risckcomply.com`. Do not substitute an unverified mailbox into procurement material.

## Public incident communication

The canonical public incident-communication authority is `https://risckcomplystatus1.statuspage.io/`. This public status channel is separate from private contact and does not create a standalone contractual availability commitment.

## Current decision

`V43_PRODUCTION=PASS_OBSERVED`  
`PROCUREMENT_READY_FOR_DILIGENCE=YES`  
`EXACT_SHA_PRODUCTION=NO_PASS`  
`ENTERPRISE_100=NO_PASS`
