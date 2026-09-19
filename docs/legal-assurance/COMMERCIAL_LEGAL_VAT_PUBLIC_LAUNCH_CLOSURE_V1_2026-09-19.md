# RISCK COMPLY — Commercial Legal + VAT Public Launch Closure V1

Date: 2026-09-19  
Scope: minimum public paid B2B self-service launch for Essential and Professional only.

## Evidence boundary

This record separates source/runtime/provider facts from owner/accountant inputs. It is not a legal opinion and does not invent registry or tax facts.

## Source and public-contract status

- Public Terms source: `0.3-review`.
- Public Privacy source: `0.2-review`.
- Public Cookie Policy source: `0.1-review`.
- Current Terms/Privacy/Cookie surfaces are review publications, not effective launch contracts.
- Essential and Professional are the only intended public self-service subscription plans in this closure scope.
- Business and Enterprise remain sales-assisted/contract-led and are not required for this public self-service launch gate.
- Checkout source already requires billing address collection, tax-ID collection and Stripe Automatic Tax.
- Production analytics is designed and CI-governed to remain consent-gated; optional analytics must remain fail-closed until the attributed Production provider/configuration facts are reconciled.

## Stripe LIVE factual snapshot

Connected LIVE account: `RISCK COMPLY SAAS`.

Observed technical facts:

- charges enabled: yes;
- payouts enabled: yes;
- Stripe Tax status: active;
- preset/default tax behavior: `exclusive`;
- preset/default product tax code: `txcd_10103001`;
- Stripe documents `txcd_10103001` as **Software as a service (SaaS) for business use**;
- Essential/Professional products do not override the product tax code, so Stripe Tax uses the preset tax code;
- active Essential/Professional prices have `tax_behavior=unspecified`, so the account default tax behavior applies;
- Stripe Tax registrations returned by the LIVE API: none;
- company tax ID supplied to the connected Stripe account: no;
- connected Stripe account currently reports `business_type=individual` while a company name is also populated.

No registry address, NIF/NIPC, VAT registration or VAT ID is promoted from Stripe account-entered data into authoritative seller facts.

## Paid launch classification

| Gate | State | Reason |
| --- | --- | --- |
| Checkout Automatic Tax | PASS | `automatic_tax.enabled=true` in source |
| Billing address collection | PASS | `billing_address_collection='required'` |
| Tax ID collection | PASS | `tax_id_collection.enabled=true` |
| Product tax-code runtime fallback | PASS_CONFIGURATION | LIVE preset `txcd_10103001`; products use preset |
| Tax-code legal/accounting suitability | OWNER_INPUT_REQUIRED | Accountant/owner must confirm classification for the actual seller/service |
| Tax behavior configuration | PASS_CONFIGURATION | LIVE default is exclusive; active plan prices inherit the default |
| Public price-display policy | OWNER_INPUT_REQUIRED | Final customer-facing VAT-inclusive/exclusive wording must match seller VAT facts and accounting decision |
| Stripe Tax registrations | OWNER_INPUT_REQUIRED | LIVE list is empty; this can only be accepted after actual VAT/tax registration status and jurisdictions are confirmed |
| Seller legal identity | OWNER_INPUT_REQUIRED | Owner-designated entity exists, but authoritative registry identifiers/address are not yet evidenced |
| Terms effective publication | BLOCKED | Review version; must not become effective until mandatory seller/tax facts close |
| Privacy effective publication | BLOCKED | Review version; controller identity and provider/transfer facts must be reconciled |
| Cookie effective publication | BLOCKED | Review version; optional analytics must stay consent-gated and runtime/provider facts reconciled |
| Public self-service contract evidence | TECHNICAL_PREPARATION_PASS | Versioned clickwrap gate added on this branch; it remains fail-closed while Terms/Privacy are review versions |

## Minimal owner/accountant questionnaire

Provide only authoritative answers/documents for these unresolved launch facts:

1. **SELLER_LEGAL_NAME** — exact legal name as shown in the current Portuguese commercial registry.
2. **SELLER_NIF_NIPC** — exact company tax/registry identifier.
3. **SELLER_REGISTERED_ADDRESS** — exact registered office from authoritative registry evidence.
4. **VAT_REGISTERED** — YES or NO for the seller for this activity.
5. **VAT_ID** — exact VAT ID if registered; otherwise explicitly confirm N/A.
6. **VAT_JURISDICTIONS** — every jurisdiction where the seller is currently registered to collect VAT/tax; explicitly confirm none beyond Portugal if that is the factual answer.
7. **PUBLIC_PRICE_DISPLAY_POLICY** — approve the exact policy for public B2B prices: VAT-exclusive, VAT-inclusive, or another accountant-approved presentation.
8. **STRIPE_TAX_PRODUCT_TAX_CODE** — confirm whether Stripe code `txcd_10103001` (“Software as a service (SaaS) for business use”) is the correct classification for RISCK COMPLY.
9. **STRIPE_ACCOUNT_ENTITY_RECONCILIATION** — confirm whether the LIVE Stripe account must be changed from `business_type=individual` to the company/seller entity and provide any Stripe-requested authoritative company/tax evidence.

## Publication rule

Do not enable public paid GA merely by setting the billing flag.

For initial paid self-service checkout, all of the following must be true:

- authoritative seller identity facts are present;
- VAT registration/jurisdiction facts are resolved;
- Stripe Tax registrations reflect the actual tax registrations where applicable;
- public price/VAT wording matches the approved fiscal treatment;
- effective Terms and Privacy versions are deliberately published;
- the browser records explicit clickwrap acceptance of those exact versions;
- Checkout metadata and the audit log preserve the accepted Terms version, Privacy version, acceptance method and timestamp.

Until then, the legal-publication gate remains fail-closed.
