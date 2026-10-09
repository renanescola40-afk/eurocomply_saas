# RISCK COMPLY — Legal / Corporate / Procurement V13 evidence reconciliation
Date: 2026-10-09
Source baseline: `95c59aa12c221bdfc067b646551307ba6f63a3bf`
Classification: INTERNAL / REVIEW; not a signed document, legal opinion, or release authorization.

## Existing materials (do not duplicate)
- `docs/evidence/LEGAL_PROCUREMENT_COMMERCIAL_CLOSURE_2026-10-03.md`
- `docs/legal-assurance/LEGAL_ENTITY_FACTS.md`
- `docs/legal-assurance/COMMERCIAL_TERMS_CONTROL_MATRIX.md`
- `docs/trust/ENTERPRISE_PROCUREMENT_PACKET.md`
- `docs/trust/ENTERPRISE_SECURITY_QUESTIONNAIRE.md`
- `docs/legal-review-preparation/legal-pack/`
- `docs/LEGAL_READINESS.md`

## Material conflict resolved in reporting (not a production code change)
The 2026-09-29 assurance snapshot says `PUBLICATION_GO=PASS`; the 2026-10-03 commercial/legal reconciliation states public Terms v0.3-review, Privacy v0.2-review, DPA review, and paid public self-serve checkout fail-closed. These refer to different publication scopes/time snapshots. For **public paid contracting**, the later and more specific 2026-10-03 legal-gate statement controls until a newer exact-SHA runtime / approved-legal-artifact check proves otherwise. Neither internal procurement-pack completion nor general site publication licenses a paid customer checkout.

## Current factual boundaries requiring retained evidence
1. Seller designated by owner: SAMUEL CERQUEIRA, UNIPESSOAL LDA. Obtain official current commercial-registration extract linking company name, NIPC and registered office. Historical candidate numbers/addresses are NOT approved for publication.
2. Confirm corporate purpose and SaaS CAE/activity via current IRN/AT evidence; submit any legally required modification only with officer authorization.
3. Validate VAT/IVA regime, intra-EU VIES applicability and invoice requirements with authoritative account-specific evidence/accountant decision.
4. Establish chain of title: creator-to-seller software rights (properly executed transfer or sufficient license as counsel determines); contributor assignments; repository, trademark, domain, design-assets ownership and OSS provenance. Owner intention alone is not transfer.
5. Approve contract formation, Terms/DPA/SLA, privacy/controller roles, data categories, legal bases, retention, subprocessor and transfer schedules; collect provider contract/account-specific records and legally effective acceptance mechanisms.
6. Confirm current public-site legal page versions, billing/checkout legal enforcement, repository main vs deployed SHA before paid activation.
7. Customer-specific Enterprise questionnaires, negotiated contracts, buyer acceptance and independent assurance are EXTERNAL, not internal pass conditions.

## Official authority references
- GDPR: https://eur-lex.europa.eu/eli/reg/2016/679/oj (especially Articles 13, 14, 28 and Chapter V).
- AI Act consolidated 2026-07-27: https://eur-lex.europa.eu/eli/reg/2024/1689/2026-07-27/eng ; apply obligation mapping only to evidence of actual deployed functions.
- Portuguese Tax Authority, CAE changes: https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/questoes_frequentes/pages/faqs-00318.aspx

## Owner / counsel decision and evidence register
| Area | Required proof / action | Responsible party | Current decision |
| --- | --- | --- | --- |
| Company identity | Current commercial registry extract showing legal identifiers and seat | Authorized company officer | EXTERNAL FACT OPEN |
| CAE / corporate purpose | IRN/AT current record and modification if necessary | Company officer / accountant | EXTERNAL FACT OPEN |
| VAT / invoices | AT evidence, applicable VIES and invoicing configuration check | Company officer / accountant | EXTERNAL FACT OPEN |
| Software IP | Executed chain-of-title or legally sufficient license; contributor and third-party evidence | Rights holders / counsel | NOT PROVEN |
| Trademark and domain | Attributable registrant and rights records | Rights holder | NOT PROVEN |
| Public commercial terms | Final wording, authorized approval, effective date, checkout incorporation | Company officer / counsel as needed | REVIEW / NOT EFFECTIVE per Oct 3 evidence |
| Privacy / DPA | Controller decision, Art. 28 approved processing schedule, effective mechanism | Company officer / privacy lead / customers | REVIEW / NOT EXECUTED |
| Provider transfers | Account-specific roles, subprocessor changes, DPA and mechanism | Provider/ privacy lead | EVIDENCE REVALIDATION OPEN |
| Procurement buyer acceptance | Buyer-specific negotiated outcomes | Buyer | EXTERNAL / NOT CLAIMED |

## Release-safe summary
- Internal document availability: substantial, already documented; do not add duplicate templates.
- LEGAL_INTERNAL_GO=BLOCKED for effective paid contracting pending above factual/approval gates, although internal documentation workstream is evidence-bound complete as of Oct 3 snapshot.
- PROCUREMENT_PACKAGE_GO=BLOCKED pending exact current-SHA evidence review; existing internal packet is documented as prepared, not accepted by any buyer.
- PUBLIC_PAID_SELF_SERVE_GA=NO based on latest reviewed legal record; requires runtime reconfirmation.
- No contracts signed, external submissions performed, emails sent, or public legal terms modified by this reconciliation.

## Acceptance and safe next steps
Attach authoritative company/tax/IP documents in a restricted data room (do not commit them to public GitHub); update the existing registries by precise evidence references; validate and approve public legal text and checkout consistency; run legal CI/runtime controls against exact deployed SHA; publish only upon affirmative authorized approval.