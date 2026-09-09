# RISCK COMPLY — Provider Facts Revalidation

Date: 2026-09-09  
Purpose: separate current connected-account/runtime observations from contractual transfer conclusions.

## Supabase

Connected Supabase account revalidation confirms the production project named `eurocomply_saas` is `ACTIVE_HEALTHY` in region **`eu-west-1`**.

Evidence boundary:

```text
SUPABASE_PRODUCTION_PROJECT_ACTIVE=PASS
SUPABASE_PROJECT_REGION=eu-west-1_VERIFIED_2026-09-09
SUPABASE_SUPPORT_ACCESS_LOCATIONS=NOT_PROVEN_BY_PROJECT_REGION
SUPABASE_DPA_ACCEPTANCE=NOT_PROVEN_BY_PROJECT_REGION
SUPABASE_CHAPTER_V_MECHANISM=NOT_PROVEN_BY_PROJECT_REGION
```

An EU project region is a technical location fact only. It does not establish every support/access/onward-transfer location or the contractual transfer mechanism.

## Vercel

Connected Vercel account revalidation confirms:

- project `eurocomply-saas` exists under the connected team;
- framework is Next.js;
- production domains include `www.risckcomply.com` and `risckcomply.com`;
- recent PR deployments are linked to the correct GitHub repository/PR metadata.

Repository `vercel.json` does **not** currently pin a function region. Therefore a historical/runtime observation such as `iad1` must not be promoted into a current contractual processing-location claim merely from repository configuration.

```text
VERCEL_PROJECT_BINDING=PASS
VERCEL_PRODUCTION_DOMAINS=PASS
VERCEL_REPO_REGION_PIN=NONE
VERCEL_PROCESSING_SUPPORT_LOCATIONS=BLOCKED_PROVIDER_CONTRACT_EVIDENCE
VERCEL_CHAPTER_V_MECHANISM=BLOCKED_PROVIDER_CONTRACT_EVIDENCE
```

## Stripe

The connected Stripe session exposes a LIVE account named `RISCK COMPLY SAAS`, but the account-info action failed at connector execution during this revalidation cycle. Therefore this lane does not re-assert account-country/legal-entity facts from that failed lookup.

```text
STRIPE_LIVE_ACCOUNT_DISCOVERY=PASS
STRIPE_LIVE_ACCOUNT_DETAIL_REVALIDATION=TOOL_BLOCKED
STRIPE_ACCOUNT_COUNTRY_CURRENT=NOT_REVALIDATED_IN_THIS_CYCLE
STRIPE_CONTRACT_TRANSFER_FACTS=BLOCKED
```

Historical billing evidence can remain an evidence source, but final legal/provider claims must cite a successful current account/provider source.

## Gmail / corporate mailbox

The corporate mailbox `comercial@risckcomply.com` is operational. A targeted search for an authoritative Certidão Permanente / Portuguese commercial-registry extract did not locate such an official company document in the connected mailbox during this cycle.

```text
CORPORATE_MAILBOX_OPERATIONAL=PASS
AUTHORITATIVE_COMPANY_REGISTRY_EVIDENCE_IN_MAILBOX=NOT_FOUND
```

## Legal consequence

These observations improve factual provider inventory but do not close GDPR Chapter V. A final transfer determination still requires the actual contracting/provider terms, relevant access/processing locations, onward processors and the lawful mechanism applicable to each real data flow.