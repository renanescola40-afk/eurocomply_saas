# RISCK COMPLY — Founder Facts Reconciliation

Date: 2026-09-09  
Status: `PARTIAL` · `OWNER_FACT_CONFLICT_PRESENT` · `NO_SYNTHETIC_COMPLETION`

## Confirmed non-conflicting facts

The following owner-supplied facts are consistent across the available founder communications and may be used in review drafts:

- Brand/product: **RISCK COMPLY**
- Contracting/legal entity name: **SAMUEL CERQUEIRA, UNIPESSOAL LDA**
- Address: **Avenida de Roma 112-A**
- Postal code: **1700-353**
- City/country: **Lisboa, Portugal**
- Website: **https://www.risckcomply.com**

These facts have been inserted only into legal **review drafts**. Their presence does not make the documents final or counsel-approved.

## Blocking conflict — tax/company identifier

Available owner communications contain more than one conflicting NIF/NIPC value for the same legal entity.

Fail-closed rule:

- no NIF/NIPC is selected by inference;
- no conflicting value is committed to the public repository as authoritative;
- Terms, Privacy and DPA retain an explicit founder-fact gate for the identifier;
- publication/signature remains blocked until one authoritative value is confirmed from a single owner-controlled or official source.

## Other founder/operator facts still requiring completion

This reconciliation does not resolve the remaining commercial and operational choices required by the legal pack, including where applicable:

- legal/privacy/security/support notice channels;
- governing law and dispute forum choice;
- subscription renewal, cancellation, refund and price-change policy;
- export window after termination;
- retention/deletion schedule and backup-cycle commitments;
- production transfer locations and mechanisms;
- subprocessor notice and objection policy;
- contractual breach-notification targets;
- liability and indemnity risk positions;
- DPO/representative position if applicable;
- customer-specific DPA Annex 1 data-subject and data-category details.

Many of these are not pure facts: they require Counsel or commercial decisions and therefore must not be auto-filled by AI.

## Acceptance boundary

```text
KNOWN_FOUNDER_IDENTITY_FACTS=PARTIAL_PASS
NIF_NIPC=BLOCKED_CONFLICT
COUNSEL_DECISIONS=PENDING
LEGAL_DOCUMENTS_FINAL=NO
```
