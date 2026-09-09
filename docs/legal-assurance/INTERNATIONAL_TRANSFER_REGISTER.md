# RISCK COMPLY — International Transfer Register

Date: 2026-09-09  
Baseline: GDPR Chapter V. This register separates runtime location facts from legal transfer mechanisms. Current revalidation details are recorded in `PROVIDER_FACTS_REVALIDATION_2026-09-09.md`.

A provider being US-owned does not by itself prove an international transfer, and an EU runtime region does not by itself prove that no third-country access/transfer can occur.

| Provider / service | Observed or documented location fact | Transfer mechanism evidence | Current state | Closure requirement |
|---|---|---|---|---|
| Supabase | Connected Production project revalidated `ACTIVE_HEALTHY` in `eu-west-1` on 2026-09-09 | Project region does not prove support/access locations or Chapter V contract treatment; account-specific terms remain open | PARTIAL_LOCATION_PASS / LEGAL_BLOCKED | Confirm contractual entity, support/access locations, subprocessors, account-specific DPA/SCC/adequacy basis and backup/support access |
| Vercel | Connected project/domains verified; current `vercel.json` does not pin a function region | Contractual transfer treatment and complete processing/support locations not frozen | PARTIAL_BINDING_PASS / LEGAL_BLOCKED | Confirm account agreement, relevant processing/support locations, applicable adequacy/SCC framework and supplementary measures if required |
| Stripe | LIVE `RISCK COMPLY SAAS` account is discoverable; account-detail revalidation failed at connector execution in this cycle | Current account/operator/transfer details not revalidated | TOOL_BLOCKED / LEGAL_BLOCKED | Re-run successful account detail/provider contract evidence and confirm actual transfer basis for relevant data flows |
| Google OAuth / Identity | Production authentication use proven | Contractual role and transfer framework not final | BLOCKED | Confirm OAuth-client contracting terms, provider role, processing/access locations and transfer basis |
| Google Workspace | EMEA billed entity evidenced historically; corporate email operational | General provider CDPA/SCC framework exists; account-specific incorporation/settings not frozen | BLOCKED | Confirm account incorporation/acceptance, data-region/admin settings if relevant, onward transfers and legal role |
| GitHub / Actions | Operational use; hosted runners may transiently process Production data in protected workflows | Current account/contract DPA treatment not final | BLOCKED | Confirm applicable agreement/entity, hosted-runner regions/access, transfer treatment and whether customer-facing disclosure is required |
| Sentry | Production diagnostic binding has historical evidence | Organisation region and account-specific DPA/transfer facts open | BLOCKED | Confirm current project/account, region, retention, scrubbing, DPA and transfer basis |
| PostHog | EU endpoint binding proven historically; connected assurance project mismatch with Production | Account-specific DPA and project ownership unresolved | BLOCKED | Recover actual Production project/account and confirm region, retention, DPA and onward transfer facts |
| Upstash | Production rate-limit use evidenced on predecessor release | General provider framework exists | BLOCKED | Exact-current binding plus account region, retention, DPA and transfer treatment |
| Resend / email provider | Historical delivery evidenced; exact-current binding open | General framework previously evidenced | BLOCKED | Confirm active provider/account/entity, region, retention, DPA and transfer basis |

## Chapter V decision rule

For each active data flow, record one of:

- `NO_THIRD_COUNTRY_TRANSFER_EVIDENCED`;
- `ADEQUACY_DECISION` with exact legal basis;
- `SCC_2021_914` with module(s), executed/accepted agreement evidence and supplementary-measures/TIA assessment where required;
- another lawful Chapter V mechanism with evidence;
- `BLOCKED` where facts are insufficient.

Do **not** use Commission Decision (EU) 2021/915 controller-processor clauses as the international-transfer SCC mechanism. The 2021/915 clauses expressly do not themselves ensure Chapter V compliance.

## Current terminal state

```text
ACTIVE_PROVIDER_INVENTORY=PARTIAL
SUPABASE_TECHNICAL_REGION=PASS_CURRENT
VERCEL_ACCOUNT_PROJECT_BINDING=PASS_CURRENT
TRANSFER_LOCATIONS=PARTIAL
ACCOUNT_SPECIFIC_TRANSFER_MECHANISMS=BLOCKED
TIA_SUPPLEMENTARY_MEASURES=NOT_TESTED_WHERE_REQUIRED
INTERNATIONAL_TRANSFERS=BLOCKED
```

The next closure action is provider-account contractual evidence reconciliation, not generic legal drafting.