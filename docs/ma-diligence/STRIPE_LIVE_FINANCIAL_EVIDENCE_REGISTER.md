# RISCK COMPLY — Stripe LIVE Financial Evidence Register

Date: 2026-10-05  
Source: authenticated Stripe LIVE account `RISCK COMPLY SAAS`  
Purpose: M&A financial/provider diligence  
Status: `STRIPE_LIVE_EVIDENCE=VERIFIED_LIMITED`

## Account identity

Authenticated LIVE Stripe account:

- account name: `RISCK COMPLY SAAS`
- country: Portugal
- default currency: EUR
- business profile name: `RISCK COMPLY`
- company name recorded by Stripe: `Samuel Cerqueira, Unipessoal Lda.`
- charges enabled: yes
- payouts enabled: yes

This is provider-originated account evidence. It is not a substitute for Portuguese commercial-registry, tax or beneficial-owner evidence.

## LIVE commercial activity at cut-off

The Stripe LIVE API was read directly with pagination support.

| Resource | Count |
|---|---:|
| Customer objects | **0** |
| Subscription objects | **0** |
| Charge objects | **0** |
| Invoice objects | **0** |
| Paid charges | **0** |
| Succeeded charges | **0** |
| Paid invoices | **0** |

The LIVE Stripe balance endpoint also returned:

- EUR available balance: **€0.00**
- EUR pending balance: **€0.00**

## Safe diligence conclusions

```text
STRIPE_LIVE_CUSTOMERS=0
STRIPE_LIVE_SUBSCRIPTIONS=0
STRIPE_LIVE_CHARGES=0
STRIPE_LIVE_INVOICES=0
STRIPE_LIVE_AVAILABLE_BALANCE_EUR=0
STRIPE_LIVE_PENDING_BALANCE_EUR=0
STRIPE_RECURRING_REVENUE_EVIDENCE=ZERO_ON_STRIPE
STRIPE_REVENUE_EVIDENCE=ZERO_ON_STRIPE
TOTAL_COMPANY_REVENUE=NOT_PROVEN_BY_STRIPE_ALONE
TOTAL_COMPANY_CASH=NOT_PROVEN_BY_STRIPE_ALONE
OFF_STRIPE_CONTRACTS_OR_BANK_RECEIPTS=ACCOUNTING_EVIDENCE_REQUIRED
```

## M&A interpretation

This evidence is sufficient to prove that, at this cut-off, the connected LIVE Stripe account contains no customer, subscription, charge or invoice activity and no Stripe-held EUR balance.

It is **not** sufficient by itself to prove:
- zero company revenue across all channels;
- zero signed contracts;
- zero bank receipts;
- zero receivables;
- zero debt;
- zero total company cash;
- accounting/tax treatment.

Those conclusions remain accountant/bank-source dependent.
