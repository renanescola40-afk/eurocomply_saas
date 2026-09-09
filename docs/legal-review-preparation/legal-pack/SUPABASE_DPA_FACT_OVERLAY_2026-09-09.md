# RISCK COMPLY — Supabase DPA factual overlay

Evidence date: 2026-09-09  
Provider response date: 2026-08-21  
Status: `PROVIDER_FACTS_PARTIALLY_CLOSED`  
Legal conclusion: `COUNSEL_REQUIRED`

## Purpose

Record bounded provider facts received directly from the Supabase Privacy Team for the RISCK COMPLY assurance lane without converting provider statements into RISCK COMPLY legal conclusions.

The original provider correspondence remains in the private communications record. This public-safe overlay contains no founder identifiers, mailbox addresses, support-message contents beyond the bounded facts needed for counsel review, or customer data.

## Provider statements received

The Supabase Privacy Team stated, in substance, that:

1. Supabase describes its service under a shared-responsibility model and characterises itself as a processor for the hosted service while customers are responsible for their own collection/use/sharing decisions.
2. From 2026-08-01, Supabase no longer requires customers to separately sign or request its standard DPA because the DPA is incorporated into its Terms of Service and its protections apply automatically to customers.
3. A customer with a separately negotiated subscription agreement or DPA remains governed by that separate agreement.
4. Supabase provides a mechanism to subscribe for future subprocessor-change notifications.
5. Supabase points customers to its current DPA/customer-resources materials and additional transfer/compliance materials.

## What this closes factually

```text
SUPABASE_STANDARD_DPA_SEPARATE_SIGNATURE_REQUIRED=NO_PER_PROVIDER
SUPABASE_STANDARD_DPA_PROVIDER_INCORPORATION_MODEL=TERMS_OF_SERVICE
SUPABASE_SUBPROCESSOR_CHANGE_NOTIFICATION_CHANNEL=AVAILABLE
SUPABASE_DIRECT_PRIVACY_TEAM_RESPONSE=RECEIVED
```

These are attributable provider facts. They eliminate the stale assumption that RISCK COMPLY must wait for a separately countersigned standard Supabase DPA before the provider can be included in the legal review pack.

## What remains open

The provider response does **not** establish all RISCK COMPLY account/legal facts. Keep these gates open:

```text
SUPABASE_SEPARATELY_NEGOTIATED_AGREEMENT_EXISTS=UNVERIFIED
SUPABASE_ACCOUNT_TERMS_VERSION_ACCEPTED=UNVERIFIED
SUPABASE_EFFECTIVE_BACKUP_PITR_RETENTION=UNVERIFIED_ACCOUNT_CONFIGURATION
SUPABASE_COMPLETE_PROCESSING_LOCATION_SET=NOT_PROVEN_BY_PROJECT_REGION_ALONE
SUPABASE_CHAPTER_V_TRANSFER_CONCLUSION=COUNSEL_REQUIRED
SUPABASE_SUBPROCESSOR_DISCLOSURE_ROLE=COUNSEL_REQUIRED
SUPABASE_CUSTOMER_DPA_DISCLOSURE_WORDING=COUNSEL_REQUIRED
```

The connected Production project is separately evidenced as `ACTIVE_HEALTHY` in `eu-west-1`. That proves a current project region fact; it does not prove every possible support, telemetry, subprocessor or transfer location.

## Role-allocation boundary

Supabase's own description of processor/controller roles is relevant provider evidence but is not adopted automatically as the final legal classification for every RISCK COMPLY processing activity. Final role allocation must be based on the actual service/configuration, RISCK COMPLY purposes/instructions, customer relationship, data flow and applicable contract.

Therefore:

```text
PROVIDER_ROLE_STATEMENT_RECEIVED=true
RISCK_COMPLY_FINAL_ROLE_CONCLUSION=OPEN
```

## Counsel handoff consequence

The eventual reviewer should no longer spend time asking whether the standard Supabase DPA requires a separate signature under the provider's current stated model. Instead, review should focus on the genuinely residual questions:

- whether a separately negotiated agreement exists for the actual account;
- which current Terms/DPA version governs;
- transfer mechanism and subprocessor treatment for the actual processing;
- account/configuration-specific retention/deletion facts;
- final customer-facing DPA/subprocessor disclosure wording.

## Credit boundary

```text
SUPABASE_DPA_PROVIDER_FACT_CLOSURE=PARTIAL_PASS
DPA_FINAL=OPEN
SUBPROCESSORS_FINAL=OPEN
INTERNATIONAL_TRANSFERS_FINAL=OPEN
QUALIFIED_LEGAL_ACCEPTANCE=OPEN
```

A provider privacy-team statement is evidence of provider policy/contract mechanics; it is not independent counsel approval of RISCK COMPLY's GDPR compliance.
