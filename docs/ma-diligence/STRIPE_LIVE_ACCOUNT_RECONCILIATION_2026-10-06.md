# RISCK COMPLY — Stripe LIVE Account Reconciliation

Date: 2026-10-06  
Scope: M&A provider requirement #93  
Status: PARTIAL_ACCOUNT_SPECIFIC_EVIDENCE / BUYER_GRADE_CLOSURE_OPEN

## Authenticated LIVE facts

Authenticated Stripe LIVE account evidence confirms:

- Account display identity: RISCK COMPLY SAAS
- Business profile name: RISCK COMPLY
- Country: PT
- Default currency: EUR
- Account type: Standard
- Charges enabled: YES
- Payouts enabled: YES
- Corporate mailbox: comercial@risckcomply.com
- Website: https://risckcomply.com
- Company name field: Samuel Cerqueira, Unipessoal Lda.
- A Portuguese external bank account is attached for payouts.
- The account has an identified human representative.
- Current account requirements show no items presently due.

## Buyer-grade gaps

The same authenticated account evidence also shows material identity gaps that prevent requirement #93 from being promoted to CLOSED:

- Stripe business_type is currently recorded as individual.
- The company tax-ID field is not provided in the account object.
- Company directors/owners are not marked as provided.
- The identified representative is present, but identity verification is not currently in a verified state.
- Official Portuguese registry/NIPC/VAT evidence has not yet been reconciled against the Stripe account.
- Transfer/change-of-control execution for a specific buyer has not occurred.

## Diligence conclusion

Stripe account control and runtime payment capability are strongly evidenced. However, buyer-grade provider closure requires reconciliation of the account's legal/business identity against authoritative Portuguese corporate and tax records and completion of any buyer-specific change-of-control or ownership-transfer steps.

Therefore:

```text
STRIPE_LIVE_ACCOUNT_CONTROL=VERIFIED
STRIPE_CHARGES_ENABLED=YES
STRIPE_PAYOUTS_ENABLED=YES
STRIPE_COMPANY_NAME_FIELD=SAMUEL_CERQUEIRA_UNIPESSOAL_LDA
STRIPE_ACCOUNT_IDENTITY_RECONCILIATION=PARTIAL
STRIPE_BUYER_TRANSFER_EXECUTED=NO
M_AND_A_REQUIREMENT_93=PARTIAL
```

No customer, revenue, tax-registration, ownership percentage, legal title, or completed transaction is inferred from this record.
