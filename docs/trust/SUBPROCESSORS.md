# RISCK COMPLY — Provider / Subprocessor Processing Register

Date: 2026-09-17  
Status: `ACTIVE_PROVIDER_SET_RECONCILED / FINAL_ROLE_AND_TRANSFER_FACTS_PARTIAL`  
Scope: providers currently evidenced as active in the RISCK COMPLY customer service or material operations that can process customer, user, support, security, billing or operational personal data.

This register separates four questions that must not be conflated:

1. whether a provider is actually used;
2. what data/purpose the integration can involve;
3. what account-specific contractual/DPA facts are attributable; and
4. the final GDPR legal role / Chapter V conclusion for the actual data flow.

A provider is not labelled a final contractual “subprocessor” merely because an SDK, account or infrastructure dependency exists. Role allocation must follow the actual processing purpose and applicable agreement. Qualified external legal review is required only where a current law, regulator, conformity route, contract, buyer requirement or material unresolved legal ambiguity genuinely requires it.

## Active provider set

| Provider / service | Current use | Data / purpose | Region / account fact | DPA / contractual evidence | Retention / subprocessors / transfer evidence | Current role state | Open gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Vercel | Application hosting, deployment, server/edge delivery | Application traffic, server execution, deployment metadata and logs | Connected team is Pro; canonical Production project and domains are attributable. Exact-current-main Production convergence is separately open | Vercel's current DPA expressly applies to Pro and Enterprise plans and states that it becomes legally binding when the customer enters the applicable Agreement. The connected team is Pro, so the public DPA framework is applicable to the connected plan. The exact contracting-customer/entity mapping is not independently retained in this register | The DPA includes cross-border transfer mechanisms/SCC treatment where required. Complete support/access locations, retention and actual flow-level Chapter V mapping remain open | `PROCESSOR_FRAMEWORK_APPLIES_TO_CONNECTED_PRO_PLAN / FINAL_ACCOUNT_AND_FLOW_MAPPING_PARTIAL` | Confirm contracting-customer/entity mapping and complete processing/access/retention/transfer facts for the actual service configuration |
| Supabase | Production Postgres, Auth, Storage and platform services | Customer workspace data, documents, account/auth metadata and operational database content | Production project `tganhbbhfxcpblmgqprg` is active in `eu-west-1` | Supabase Privacy Team confirmed that from 2026-08-01 the general customer DPA is incorporated into the Terms and applies without separate signature; a separately negotiated agreement, if any, would continue to govern | Subprocessor updates are available from Supabase; complete support/onward-access, backup and transfer facts remain flow-specific | `PROCESSOR_FRAMEWORK_ATTRIBUTABLE / FINAL_FLOW_MAPPING_PARTIAL` | Confirm whether any separately negotiated agreement applies and close support/access/backup/Chapter V facts for the actual account |
| Stripe | Billing, subscription, invoicing/payment-related service | Billing/contact/tax/subscription metadata; payment details handled within Stripe service | LIVE RISCK COMPLY account is attributable; fiscal/account details are owned by Prompt 3 | Final account-specific agreement/DPA/role treatment is not closed in this lane | Retention, subprocessors and transfer treatment remain tied to Prompt 3/account evidence | `MIXED_OR_CONTRACT_DEFINED_ROLE / PROMPT_3_OWNS_FISCAL_ACCOUNT_FACTS` | Prompt 3 account/VAT/provider reconciliation plus final privacy-role mapping for disclosed billing flows |
| Google OAuth / Google Identity | User authentication through Supabase Auth | Provider-returned authentication identifiers and profile metadata | Runtime integration is implemented; exact OAuth account/legal facts are not frozen here | Applicable Google identity terms/account treatment not yet attributed | Complete processing/access/retention/transfer position remains open | `ROLE_TO_BE_MAPPED_FROM_ACTUAL_OAUTH_FLOW_AND_TERMS` | Current account terms and factual processing/transfer mapping |
| Google Workspace | Corporate support, legal, security and procurement communications | Business contact details, message content/attachments where sent to corporate mailboxes | Corporate `risckcomply.com` mail is operational | Current applicable Workspace agreement/CDPA incorporation has not been revalidated in this lane | Current retention/admin region and onward-transfer settings remain open | `OPERATIONAL_COMMUNICATIONS_PROVIDER / ROLE_FLOW_SPECIFIC` | Current CDPA/account settings, retention and transfer facts where customer/support data is processed |
| GitHub / GitHub Actions | Source control and CI/CD; protected workflows | Source/workflow metadata, security artifacts and transient Production data in authorised protected jobs where applicable | Repository and protected Actions workflows are active | Applicable account/company DPA treatment is not yet attributed | GitHub-hosted runner processing/access and transfer treatment remain to be mapped for any Production-data workflow | `MATERIAL_OPERATIONAL_PROCESSOR_CANDIDATE / FINAL_ROLE_OPEN` | Account agreement/DPA applicability and protected-runner data/transfer boundary |
| Cloudflare | Authoritative DNS, DNSSEC and proxied public edge/security boundary | Public request/network metadata, TLS/edge/security processing | Canonical public hostname is evidenced behind Cloudflare proxy; DNSSEC and edge TLS configuration are operational facts | Cloudflare's current DPA forms part of the applicable Main Agreement; Cloudflare's current GDPR materials state that for Self-Service customers the DPA is incorporated by reference into the Self-Serve Subscription Agreement. Exact RISCK COMPLY account plan/entity provenance is not independently retained here | Current provider materials describe SCC/DPF safeguards for relevant cross-border transfers. Enabled edge products/logging, retention and actual access/flow mapping remain open | `PROCESSOR_FRAMEWORK_PUBLICLY_INCORPORATED_FOR_SELF_SERVICE / ACCOUNT_CONFIGURATION_MAPPING_OPEN` | Confirm current account plan/entity provenance, enabled products/logging, retention and actual transfer/access flows |
| Sentry | Error monitoring / diagnostics integration | Error context, diagnostic metadata and potentially user/request identifiers subject to scrubbing/configuration | Runtime integration exists; human Sentry correspondence for the discussed service identified storage in the Netherlands. Exact Production organization/project settings remain to be frozen | Human Sentry support confirmed that the standard DPA applies to all self-service customers; public Sentry materials provide the standard DPA and international-transfer safeguards. The exact account acceptance event/settings remain visible only through the applicable organization/account context and are not independently retained here | Exact retention, scrubbing/data categories, subprocessor configuration and flow-level transfer/access mapping remain open | `PROCESSOR_FRAMEWORK_SELF_SERVICE_PROVIDER_CONFIRMED / CONFIG_MAPPING_PARTIAL` | Freeze the Production organization/project, retention and scrubbing settings and reconcile actual diagnostic data categories before final customer disclosure |
| PostHog | Consent-gated product analytics when enabled | Product analytics events and identifiers after applicable consent/configuration | Human PostHog response confirmed EU Cloud hosting in Frankfurt for the discussed organization. The currently connected `Default project` is not attributable as the RISCK COMPLY Production project | Human PostHog response stated a countersigned DPA is required; PandaDoc subsequently confirmed `PostHog DPA — Samuel Cerqueira, Unipessoal, Lda` completed by all participants on 2026-09-01 | DPA identifies transfer/subprocessor mechanisms; actual Production project ownership, retention and active data flow still require recovery/revalidation | `DPA_EXECUTED / PRODUCTION_PROJECT_ATTRIBUTION_OPEN` | Recover actual Production project/account if analytics is active and verify retention/current project configuration |
| Upstash / Redis | Distributed rate limiting/security-control state | Operational request/control metadata and identifiers; Redis keys used for security/rate-limiting functions | Integration is present. Current account plan and configured deployment region must be read from the actual database console | Human Upstash support confirmed standard DPA is automatically incorporated into Terms on account creation/use; self-service counterparty is Upstash, Inc. | Support states SCC Module 2 + EU-US DPF in DPA; Redis lifecycle uses TTL/explicit deletion; automated backups expire after 1 day or up to 3 days with Prod Pack | `PROCESSOR_FRAMEWORK_ATTRIBUTABLE / ACCOUNT_REGION_PLAN_OPEN` | Verify actual current database plan, primary/read regions and whether Prod Pack changes backup period |
| Resend | Transactional email delivery | Recipient email addresses, message metadata and transactional message content | Production code and policy require transactional email provider configuration; historical real delivery exists | Resend's current Terms expressly incorporate its DPA into the Agreement and state that signup/purchase/click acceptance binds the Agreement; the DPA states it becomes binding on acceptance of the Agreement. This establishes the public contractual framework, but this register does not independently retain the exact account acceptance event or contracting-customer/entity provenance | The current DPA incorporates EU SCCs for relevant ex-EEA transfers, identifies Resend as processor for covered customer processing and states deletion of customer/user data within 90 days after account termination. Actual account configuration and enabled-feature retention still require account-level mapping | `PROCESSOR_FRAMEWORK_INCORPORATED_BY_TERMS / ACCOUNT_ENTITY_AND_CONFIGURATION_MAPPING_OPEN` | Confirm current Production account/entity provenance and enabled-feature configuration/retention before final customer disclosure |

## Providers not included as active subprocessors

- **Direct SaaS model provider:** no direct customer-facing model provider/runtime is currently identified. Founder-operated ChatGPT/AI use outside the SaaS runtime is not silently added to the customer subprocessor list.
- **External malware/content scanner:** the Enterprise runtime policy may require scanning, but no currently active external scanner provider/account has been attributed by this register. If one is enabled, add it before customer disclosure.
- Any future vendor must be added only after actual use is established.

## Account-specific evidence credited in this revision

### Vercel

Current official Vercel DPA (last updated 2026-03-17; effective 2026-03-31) states that it applies to Vercel processing of Customer Data as a processor for customers on Pro and Enterprise plans, becomes legally binding when the customer enters the applicable Agreement or executes the DPA, and includes cross-border transfer mechanisms for covered transfers. The connected RISCK COMPLY Vercel team is currently Pro.

```text
VERCEL_CONNECTED_TEAM_PLAN=PRO_CONNECTED_PROVIDER_FACT
VERCEL_CURRENT_DPA_APPLIES_TO_PRO_PLAN=YES_PUBLIC_PROVIDER_FACT
VERCEL_DPA_BINDING_MECHANISM=ENTRY_INTO_APPLICABLE_AGREEMENT_OR_EXECUTION_PUBLIC_PROVIDER_FACT
VERCEL_DPA_CROSS_BORDER_MECHANISM=INCLUDED_WHERE_REQUIRED_PUBLIC_PROVIDER_FACT
VERCEL_EXACT_CONTRACTING_ENTITY_MAPPING=OPEN
VERCEL_ACTUAL_FLOW_RETENTION_ACCESS_MAPPING=OPEN
```

This closes the generic “is there an applicable DPA framework for this plan?” question. It does not, by itself, prove every account-level customer-identity, product-option, data-location, retention or support-access fact.

### Supabase

Attributable provider correspondence dated 2026-08-21 states:

```text
SUPABASE_GENERAL_DPA_INCORPORATED_IN_TERMS_FROM_2026_08_01=YES_PROVIDER_CONFIRMED
SUPABASE_SEPARATE_SIGNATURE_REQUIRED_FOR_GENERAL_ROUTE=NO_PROVIDER_CONFIRMED
SUPABASE_SUBPROCESSOR_UPDATE_CHANNEL=AVAILABLE_PROVIDER_CONFIRMED
SUPABASE_PROJECT_REGION=eu-west-1_CURRENT_CONNECTED_PROJECT
```

This does not prove every support/access location, backup cycle or Chapter V conclusion.

### Cloudflare

Current official Cloudflare privacy/DPA materials state that the DPA forms part of the applicable customer agreement and that Self-Service customers receive the DPA by incorporation into the Self-Serve Subscription Agreement. Current provider materials also describe SCC and EU-US DPF safeguards for relevant international transfers.

```text
CLOUDFLARE_CURRENT_DPA_FRAMEWORK=PUBLIC_PROVIDER_EVIDENCE
CLOUDFLARE_SELF_SERVICE_DPA_INCORPORATION=YES_PUBLIC_PROVIDER_FACT
CLOUDFLARE_TRANSFER_SAFEGUARDS=SCC_AND_DPF_FRAMEWORK_PUBLIC_PROVIDER_FACT
CLOUDFLARE_EXACT_ACCOUNT_PLAN_AND_ENTITY_PROVENANCE=OPEN
CLOUDFLARE_ENABLED_PRODUCTS_LOGGING_RETENTION=OPEN
```

This closes the generic self-service DPA-framework question but not the account-specific configuration, retention or flow-by-flow Chapter V analysis.

### Sentry

Attributable human Sentry correspondence dated 2026-08-27 states that the Sentry DPA applies to all self-service customers. Separate attributable human Sentry correspondence for the discussed service states that stored data is hosted in the Netherlands. Public Sentry materials provide the standard DPA and international-transfer safeguards.

```text
SENTRY_SELF_SERVICE_DPA_APPLIES=YES_PROVIDER_CONFIRMED
SENTRY_DISCLOSED_STORAGE_REGION=NETHERLANDS_PROVIDER_CONFIRMED_FOR_DISCLOSED_SERVICE
SENTRY_EXACT_ACCOUNT_ACCEPTANCE_EVENT=NOT_INDEPENDENTLY_RETAINED
SENTRY_PRODUCTION_ORG_PROJECT_SETTINGS=OPEN
SENTRY_RETENTION_SCRUBBING_DATA_CATEGORIES=OPEN
```

The provider statements narrow the framework and region questions without creating unsupported proof of the exact Production organization/project settings or its full diagnostic data flow.

### PostHog

Attributable human provider correspondence and PandaDoc completion evidence support:

```text
POSTHOG_CONTRACTING_ENTITY_FOR_DISCLOSED_EU_CLOUD_ORG=PostHog_Inc_PROVIDER_CONFIRMED
POSTHOG_DISCLOSED_HOSTING_REGION=EU_FRANKFURT_PROVIDER_CONFIRMED
POSTHOG_STANDARD_DPA_REQUIRES_ACCOUNT_GENERATION_COUNTERSIGNATURE=YES_PROVIDER_CONFIRMED
POSTHOG_DPA_SAMUEL_CERQUEIRA_UNIPESSOAL_LDA=COMPLETED_ALL_PARTICIPANTS_2026_09_01
POSTHOG_CURRENT_CONNECTED_PROJECT_IS_PRODUCTION=NO_EVIDENCE
```

The executed DPA does not convert the currently accessible non-Production project into the Production analytics authority.

### Upstash

Attributable human support correspondence dated 2026-08-27 supports:

```text
UPSTASH_STANDARD_DPA_AUTOMATICALLY_INCORPORATED=YES_PROVIDER_CONFIRMED
UPSTASH_SELF_SERVICE_CONTRACTING_ENTITY=Upstash_Inc_PROVIDER_CONFIRMED
UPSTASH_DPA_TRANSFER_SAFEGUARDS=SCC_MODULE_2_PLUS_EU_US_DPF_PROVIDER_CONFIRMED
UPSTASH_BACKUP_RETENTION=1_DAY_OR_UP_TO_3_DAYS_WITH_PROD_PACK_PROVIDER_CONFIRMED
UPSTASH_CURRENT_ACCOUNT_PLAN_AND_REGION=NOT_YET_REVALIDATED
```

### Resend

Current official Resend Terms and DPA (last updated 2026-08-27) state that the DPA is incorporated into the Agreement and becomes legally binding on acceptance of the Agreement. The DPA identifies Resend as processor for covered processing, incorporates EU SCCs for relevant ex-EEA transfers, and states that customer/user data is deleted within 90 days after account termination.

```text
RESEND_DPA_INCORPORATED_IN_CURRENT_TERMS=YES_PUBLIC_PROVIDER_FACT
RESEND_DPA_BINDING_MECHANISM=ACCEPTANCE_OF_AGREEMENT_OR_EXECUTION_PUBLIC_PROVIDER_FACT
RESEND_PROCESSOR_ROLE_FOR_COVERED_CUSTOMER_PROCESSING=YES_PUBLIC_PROVIDER_FACT
RESEND_EU_SCC_MECHANISM=INCLUDED_FOR_RELEVANT_TRANSFERS_PUBLIC_PROVIDER_FACT
RESEND_POST_TERMINATION_DELETION_TARGET=WITHIN_90_DAYS_PUBLIC_PROVIDER_FACT
RESEND_EXACT_ACCOUNT_ACCEPTANCE_EVENT=NOT_RETAINED_IN_THIS_REGISTER
RESEND_EXACT_CONTRACTING_ENTITY_MAPPING=OPEN
```

This closes the generic public-framework question without claiming an account-specific acceptance timestamp or customer-entity mapping that is not independently retained.

## Customer notice / authorisation boundary

The owner-selected DPA position is general written authorisation for subprocessors with a target of 30 days' advance notice for new material subprocessors where practicable and contractually applicable, plus reasonable data-protection objection mechanics. That is an owner-selected contractual position, not proof that every upstream provider guarantees the same notice period.

Final customer-facing provider disclosure must state only the providers and processing actually used for the customer's service. A provider that is only operational/internal must not automatically be labelled a customer-data subprocessor if the actual flow does not support that role.

## Change control

Revalidate this register before release or customer disclosure when:

1. a provider is added/removed;
2. a provider region, plan, retention or processing purpose changes;
3. analytics, model inference, scanning or a new communication provider is enabled;
4. a provider DPA/subprocessor list materially changes;
5. an actual customer agreement imposes a stricter notice/role/transfer requirement; or
6. attributable runtime/account evidence contradicts this register.

## Current terminal state

```text
ACTIVE_PROVIDER_SET=RECONCILED_CURRENT_EVIDENCE
VERCEL_DPA_FRAMEWORK=PASS_CONNECTED_PRO_PLAN_PUBLIC_PROVIDER_EVIDENCE
VERCEL_ACCOUNT_ENTITY_FLOW_MAPPING=OPEN
SUPABASE_DPA_FRAMEWORK=PASS_ATTRIBUTABLE
CLOUDFLARE_DPA_FRAMEWORK=PASS_PUBLIC_SELF_SERVICE_INCORPORATION
CLOUDFLARE_ACCOUNT_CONFIGURATION_MAPPING=OPEN
SENTRY_DPA_FRAMEWORK=PASS_PROVIDER_CONFIRMED_SELF_SERVICE
SENTRY_STORAGE_REGION=PASS_PROVIDER_CONFIRMED_NETHERLANDS_FOR_DISCLOSED_SERVICE
SENTRY_PRODUCTION_CONFIGURATION_MAPPING=OPEN
POSTHOG_DPA=PASS_COMPLETED_ALL_PARTICIPANTS
UPSTASH_DPA_FRAMEWORK=PASS_ATTRIBUTABLE
GOOGLE_IDENTITY_WORKSPACE_ACCOUNT_FACTS=OPEN
GITHUB_ACCOUNT_DPA_TRANSFER_FACTS=OPEN
RESEND_DPA_FRAMEWORK=PASS_PUBLIC_TERMS_INCORPORATION
RESEND_ACCOUNT_ENTITY_CONFIGURATION_MAPPING=OPEN
STRIPE_PRIVACY_FISCAL_ACCOUNT_FACTS=ROUTED_PROMPT_3
FINAL_SUBPROCESSOR_CUSTOMER_SCHEDULE=PARTIAL_NOT_FINAL
QUALIFIED_EXTERNAL_REVIEW=ONLY_IF_CURRENT_SCOPE_TRIGGER_REQUIRES
```

This register is evidence-bound and is not itself a certification, regulator approval, legal opinion or customer acceptance.
