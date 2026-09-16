# RISCK COMPLY — GDPR Article 35 DPIA Screening

Date: 2026-09-17  
Scope: RISCK COMPLY's own current processing and platform operating model. Customer-specific use cases may independently require a customer DPIA. This is an applicability screening, not a legal opinion or regulator decision.

Official-source baseline: GDPR Articles 35–36, EDPB-endorsed WP248 rev.01 and current CNPD DPIA guidance / Regulation 798/2018 reference, recorded in `GDPR_OFFICIAL_SOURCE_REGISTER_2026-09-09.md`.

## Screening factors

| Factor | Current evidence | Screening result |
|---|---|---|
| Systematic evaluation/profiling of natural persons | No current provider-side feature systematically evaluates natural persons | NO_CURRENT_TRIGGER |
| Automated legal/similarly significant decisions | No current provider-side solely automated decision about natural persons with legal/similarly significant effects is identified | NO_CURRENT_TRIGGER |
| Large-scale special-category/criminal data | Special-category/criminal data is not an ordinary supported default purpose and requires expressly approved scope plus additional safeguards | NO_CURRENT_TRIGGER |
| Large-scale processing generally | Current Production aggregates do not evidence large-scale person-centric processing, and the service purpose is B2B organisation/workspace compliance governance | NO_CURRENT_HIGH_RISK_TRIGGER |
| Systematic monitoring | Security/audit telemetry is used to secure and operate the service; no core large-scale monitoring of natural persons is identified | NO_CURRENT_TRIGGER |
| Novel technology / AI | Current accepted customer-facing runtime is deterministic; no direct model runtime or AI-driven person profiling is identified | NO_CURRENT_AI_TRIGGER |
| Vulnerable individuals | Not an intended provider-side target group | NO_CURRENT_TRIGGER / CUSTOMER_SPECIFIC_REOPEN |
| Data combination/matching | Operational account/workspace/billing/security metadata may be combined to deliver and secure the service; no high-risk person-scoring purpose is identified | NO_CURRENT_HIGH_RISK_TRIGGER |
| Denial of service/rights or inability to exercise rights | Billing/access controls affect contractual service access but are not evidenced as Article 35 person-level legal/similarly significant automated decisions | NO_CURRENT_TRIGGER |

## Current runtime scale evidence

Read-only aggregate Production inspection on 2026-09-17 observed:

```text
AUTH_USERS=207
ORGANIZATIONS=257
ORGANIZATION_MEMBERS=196
DATA_SUBJECT_REQUESTS=0
AI_INCIDENTS=0
```

These figures are a point-in-time indicator and not a universal threshold for “large scale”. They are considered together with purpose, categories, monitoring behavior and decision effects.

## Portuguese supervisory-authority boundary

Current CNPD guidance states that an AIPD/DPIA is required where processing is likely to create high risk, including relevant large-scale Article 9/10 data, large-scale systematic monitoring of publicly accessible areas, and profiling followed by significantly affecting automated decisions. The current RISCK COMPLY provider-side processing evidence does not establish those conditions.

The Article 36 boundary remains unchanged: if a future required DPIA leaves high residual risk despite mitigation, prior consultation with CNPD becomes a separate external gate and cannot be self-closed.

## Separation from customer DPIA/FRIA

RISCK COMPLY supports customer DPIA/FRIA evidence workflows. That does not mean RISCK COMPLY performs or satisfies every customer's DPIA/FRIA duty. A customer's own high-risk processing remains the customer's applicability decision, with processor assistance where contractually/applicably required.

## Current determination

```text
CNPD_DPIA_GUIDANCE=VERIFIED
CNPD_REGULATION_798_2018=REFERENCE_VERIFIED
DPIA_SCREENING=PASS_CURRENT_SCOPE
DPIA_REQUIRED=NO_CURRENT_MANDATORY_TRIGGER_IDENTIFIED
PROVIDER_SIDE_HIGH_RISK_TRIGGER=NOT_IDENTIFIED_ON_CURRENT_EVIDENCE
CUSTOMER_SPECIFIC_DPIA=OUTSIDE_THIS_GLOBAL_SCREENING
EXTERNAL_COUNSEL_REQUIRED_FOR_THIS_APPLICABILITY_DECISION=NO_AUTOMATIC_REQUIREMENT
```

Rationale: the current provider-side operation is not evidenced as likely to result in the kind of high risk that triggers Article 35. The conclusion is scoped to the current processing facts and must be reopened on material change.

## Change triggers

Reopen the screening before activating or relying on any changed processing that introduces one or more materially relevant risk factors, especially:

1. large-scale Article 9/10 processing;
2. systematic large-scale monitoring, including publicly accessible areas;
3. profiling or automated decisions with legal/similarly significant effects;
4. materially larger person-centric processing combined with additional high-risk criteria;
5. vulnerable-person targeting, biometric/emotion-recognition, employment, credit, essential-service or similar high-impact processing;
6. direct model-driven person inference/recommendation added to the product;
7. new data matching/combination that materially changes risk;
8. regulator/authority/customer facts that establish a specific high-risk use case.

If a trigger is met, conduct a fresh Article 35 screening and, where required, complete a DPIA before the relevant processing is treated as closed.