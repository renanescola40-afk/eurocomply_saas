# RISCK COMPLY — GDPR Article 37 DPO Requirement Assessment

Date: 2026-09-17  
Purpose: determine whether appointment of a Data Protection Officer is mandatory for the current evidenced RISCK COMPLY scope. This is a documented applicability assessment, not a legal opinion and not a claim that a DPO can never become mandatory.

Official-source baseline: GDPR Article 37 plus current CNPD/EDPB guidance recorded in `GDPR_OFFICIAL_SOURCE_REGISTER_2026-09-09.md`.

## Article 37 screening

| Criterion | Current evidence | State |
|---|---|---|
| Public authority/body | RISCK COMPLY is a private B2B SaaS service, not a public authority/body | NOT_APPLICABLE_CURRENT_SCOPE |
| Core activities require regular and systematic monitoring of data subjects on a large scale | Core product activity is organisation/workspace-based compliance governance. No current feature or purpose requires large-scale behavioural monitoring/profiling of natural persons | NO_CURRENT_TRIGGER |
| Core activities consist of large-scale Article 9 / Article 10 processing | DPA/service boundary excludes special-category/criminal data as an ordinary default use case and requires expressly approved scope plus safeguards before intentional processing | NO_CURRENT_TRIGGER |
| Other EU/Member State law requires DPO | No additional current-scope mandatory trigger has been identified in the official-source register | NO_CURRENT_TRIGGER_IDENTIFIED |

## Current runtime scale evidence

Read-only aggregate Production inspection on 2026-09-17 observed:

```text
AUTH_USERS=207
ORGANIZATIONS=257
ORGANIZATION_MEMBERS=196
DATA_SUBJECT_REQUESTS=0
AI_INCIDENTS=0
```

These aggregates are a point-in-time scale indicator only. They are not used as a universal numerical definition of “large scale”. They support the current conclusion when combined with the service purpose, data-category boundary and absence of a core large-scale monitoring activity.

## Current product-purpose evidence

- The accepted customer-facing runtime is a deterministic compliance/governance application; no direct model runtime was identified in the current product inventory.
- Account, membership, security, support and billing processing are ancillary/operational to delivering the B2B service rather than a business model based on monitoring natural persons.
- Customer-entered AI/governance records may contain personal data, but the platform does not thereby become a large-scale monitoring service.
- Special-category and criminal-offence data are not an ordinary supported default purpose. Any deliberate expansion into that processing requires a fresh applicability assessment before activation.

## Current determination

```text
DPO_APPLICABILITY_ASSESSMENT=PASS_CURRENT_SCOPE
DPO_REQUIRED=NO_CURRENT_MANDATORY_TRIGGER_IDENTIFIED
DPO_APPOINTED=NO_CLAIM
DPO_CONTACT=NOT_REQUIRED_FOR_PUBLICATION_ON_CURRENT_EVIDENCE
EXTERNAL_COUNSEL_REQUIRED_FOR_THIS_APPLICABILITY_DECISION=NO_AUTOMATIC_REQUIREMENT
```

Rationale: Article 37 makes a DPO mandatory for specified circumstances, including public bodies, core large-scale regular/systematic monitoring, or core large-scale Article 9/10 processing. The currently evidenced RISCK COMPLY scope does not establish any of those circumstances.

## Change triggers

Reopen this assessment before relying on the current determination if any of the following becomes true:

1. core product activity changes to regular/systematic monitoring or profiling of natural persons at materially larger scale;
2. intentional large-scale Article 9 or Article 10 processing becomes part of the ordinary service;
3. a law applicable to the actual activity creates an additional DPO requirement;
4. a regulator or competent authority provides an attributable contrary determination;
5. acquisition/customer expansion materially changes processing scale, geography, persistence or purpose; or
6. a customer-specific configuration makes RISCK COMPLY itself responsible for a qualifying core processing activity.

A voluntary DPO or privacy lead may still be appointed for governance reasons. Voluntary appointment is separate from the current statutory-trigger assessment.