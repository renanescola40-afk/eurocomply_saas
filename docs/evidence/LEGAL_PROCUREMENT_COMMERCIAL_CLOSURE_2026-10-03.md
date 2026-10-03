# RISCK COMPLY — Legal + Procurement + Commercial Readiness Closure — 2026-10-03

Status: `EVIDENCE_BOUND / INTERNAL_CLOSURE_WITH_EXTERNAL_FACT_GATES`

## Release binding

- Source baseline at start of closure: `0539e2ba189fdd504f4bd3c40683026db21c9932`
- Production Vercel deployment observed READY on the same source SHA before this documentation branch was created.
- This branch changes procurement/trust disclosure and closure documentation only. It does not convert external facts into verified facts.

## Canonical internal legal/procurement posture

The existing canonical legal, privacy, security and procurement packages remain the baseline:
- `docs/evidence/ASSURANCE_LEGAL_TERMINAL_CLOSURE_2026-09-29.md`
- `docs/evidence/EXTERNAL_ASSURANCE_LEGAL_FINAL_SCORECARD.md`
- `docs/trust/PROCUREMENT_LEGAL_PRIVACY_CLOSURE_2026-09-24.md`
- `docs/trust/ENTERPRISE_PROCUREMENT_PACKET.md`
- `docs/trust/ENTERPRISE_SECURITY_QUESTIONNAIRE.md`
- `docs/trust/FINAL_DATA_ROOM_INDEX_2026-09-24.md`

Internal documentation/control status remains `COMPLETE_EVIDENCE_BOUND`. Buyer-specific acceptance, signatures, negotiated terms, qualified review when required, and independent pentest/retest remain external.

## Seller / fiscal truth matrix

| Fact | Current evidence | Classification | Closure |
| --- | --- | --- | --- |
| Operator / contracting entity | Owner-designated as SAMUEL CERQUEIRA, UNIPESSOAL LDA in canonical owner/legal material | `OWNER_DECLARED` | Keep as designated entity; do not represent registry facts as independently verified |
| Candidate NIF/NIPC | 515099899 appears in owner-prepared/EEN material and historical working evidence | `OWNER_DECLARED_NOT_REGISTRY_VERIFIED` | `EXTERNAL_ACTION_REQUIRED`: obtain current attributable Portuguese registry/tax evidence |
| Candidate registered address | Present in owner-prepared EEN registration material | `OWNER_DECLARED_NOT_REGISTRY_VERIFIED` | `EXTERNAL_ACTION_REQUIRED`: reconcile against current commercial-registry evidence |
| SaaS/software CAE/activity | Historical legal matrix records software activity as owner-deferred | `NOT_VERIFIED` | `EXTERNAL_ACTION_REQUIRED`: verify current registered activity/CAE with authoritative registry/AT/accountant evidence and add/update if required |
| VAT/IVA registration | No authoritative AT/VIES evidence in the connected evidence set | `NOT_VERIFIED` | `EXTERNAL_ACTION_REQUIRED`: confirm current Portuguese VAT regime and VAT ID with AT/accountant evidence |
| Intra-EU VAT / VIES | No attributable current VIES result retained in the connected evidence set | `NOT_VERIFIED` | `EXTERNAL_ACTION_REQUIRED`: verify VIES status if applicable |
| Stripe Tax registrations | LIVE Stripe account returned zero Tax Registration objects on 2026-10-03 | `VERIFIED_STRIPE_STATE` | Do not infer Portuguese tax-registration status from Stripe; configure only after authoritative tax facts exist |
| PT/EU/non-EU invoicing | Technical billing/invoice capabilities do not prove tax treatment | `FACT_DEPENDENT` | `EXTERNAL_ACTION_REQUIRED`: accountant/tax authority confirms treatment and invoice fields before binding public paid launch |
| Contract seller / invoice seller | Intended entity is owner-designated; final identifiers/address remain unverified | `PARTIAL` | Bind final effective Terms/invoice identity only after authoritative seller facts are accepted |

## Public legal publication state

Current runtime/code intentionally remains fail-closed:

- Terms: `0.3-review`, `publicationState=review`, no effective date.
- Privacy: `0.2-review`, `publicationState=review`, no effective date.
- DPA public surface: review draft / factual closure required.
- Public self-serve checkout rejects ordinary production checkout when `isPublicSelfServeContractEffective()=false`.

This is the correct behavior while mandatory contracting/entity/tax facts remain unresolved. Do **not** flip the legal publications to effective merely to satisfy a readiness score.

## External assurance boundary

- Third-party black-box web application assessment: completed 2026-09-12; confidential attributable report received.
- Clean independent retest / terminal assurance: OPEN.
- MaaSec pentest: ADJOURNED / PENDING; no pass claim.
- SOC 2: NOT CLAIMED.
- ISO 27001 certification: NOT CLAIMED.

## DR disclosure reconciliation

The 2026-10-03 dedicated recovery exercise proved:
- canonical migration replay 113/113;
- public table parity 107/107;
- RLS-enabled table parity 107/107;
- recovery from real migration-replay failures in the disposable target.

It did **not** prove:
- customer-data backup/PITR restore;
- Supabase Storage object restore/checksums;
- full recovered-application smoke;
- measured RPO;
- full application RTO.

Public trust wording must preserve this split.

## Internal closure verdict

```text
LEGAL_INTERNAL_DOCUMENTATION=PASS
PRIVACY_INTERNAL_DOCUMENTATION=PASS_EVIDENCE_BOUND
PROCUREMENT_INTERNAL=PASS
ASSURANCE_PACK_INTERNAL=PASS_EVIDENCE_BOUND
SECURITY_QUESTIONNAIRE_BANK=PASS
SELLER_ENTITY_DESIGNATION=PASS_OWNER_DECLARED
SELLER_REGISTRY_FACTS=EXTERNAL_ACTION_REQUIRED
VAT_IVA=EXTERNAL_ACTION_REQUIRED
VIES=EXTERNAL_ACTION_REQUIRED_IF_APPLICABLE
SOFTWARE_CAE_ACTIVITY=EXTERNAL_ACTION_REQUIRED
PUBLIC_TERMS_EFFECTIVE=NO
PUBLIC_PRIVACY_EFFECTIVE=NO
PUBLIC_DPA_EXECUTED=NO
PUBLIC_SELF_SERVE_LEGAL_GATE=FAIL_CLOSED_AS_DESIGNED
PENTEST_EXTERNAL_STATUS=PENDING
```

## Commercial consequence

`DEMO_GO=YES` and `ENTERPRISE_SALES_CONVERSATIONS_GO=YES` remain supportable with evidence-bound disclosures.

`PUBLIC_PAID_SELF_SERVE_GA=NO` until authoritative seller/fiscal facts are reconciled and the final effective legal publication is deliberately accepted and deployed.

No email was sent, replied to, forwarded, or followed up as part of this closure.
