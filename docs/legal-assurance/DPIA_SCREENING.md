# RISCK COMPLY — GDPR Article 35 DPIA Screening

Date: 2026-09-09  
Scope: RISCK COMPLY's own processing and the platform processing model. Customer-specific use cases may independently require customer DPIAs.

Official-source baseline: GDPR Articles 35–36, EDPB-endorsed WP248 rev.01 and current CNPD DPIA guidance / Regulation 798/2018 reference, recorded in `GDPR_OFFICIAL_SOURCE_REGISTER_2026-09-09.md`.

## Screening factors

| Factor | Current evidence | Screening result |
|---|---|---|
| Systematic evaluation/profiling of natural persons | No evidence that RISCK COMPLY's website/account administration makes systematic evaluations of individuals with significant effects | NO_TRIGGER_PROVEN |
| Automated legal/similarly significant decisions | Privacy draft states no intended solely automated provider-side website/account decisions of this kind | NO_TRIGGER_PROVEN |
| Large-scale special-category/criminal data | DPA draft prohibits such data unless expressly approved; actual scale/customer-content posture is not yet proven | FACTS_INSUFFICIENT |
| Large-scale processing generally | B2B SaaS architecture can scale, but actual personal-data scale is not established in the legal evidence pack | FACTS_INSUFFICIENT |
| Systematic monitoring | Security/audit telemetry exists, but current evidence does not establish large-scale monitoring of data subjects as a core purpose | FACTS_INSUFFICIENT |
| Novel technology / AI | Product operates in AI governance/compliance and may include AI-assisted functionality; novelty is a risk factor but not alone a DPIA conclusion | RISK_FACTOR_PRESENT |
| Vulnerable individuals | Not an intended provider-side target group; customer use cases may involve vulnerable groups | CUSTOMER_SPECIFIC / NOT_PROVEN_FOR_PROVIDER |
| Data combination/matching | Account, workspace, billing/security metadata may be combined operationally; no high-risk combination purpose established | PARTIAL_FACTOR |
| Denial of service/rights or inability to exercise rights | Billing/access decisions affect service access, but no provider-side processing with legal/similar effects on individuals has been established | NO_HIGH_RISK_TRIGGER_PROVEN |

## Portuguese supervisory-authority verification

CNPD's current DPIA guidance confirms that Article 35 DPIA is required when the processing is likely to create high risk, including relevant large-scale Article 9/10 data, large-scale systematic monitoring of publicly accessible areas and profiling followed by significant automated decisions. CNPD also points to Regulation 798/2018 as Portugal's Article 35(4) list.

The same guidance preserves the Article 36 boundary: if a completed DPIA still shows high residual risk despite mitigations, prior consultation with CNPD is a separate gate and must not be self-closed.

## Separation from customer DPIA/FRIA

RISCK COMPLY may support customer DPIA/FRIA evidence workflows. That does not mean RISCK COMPLY itself performs or satisfies every customer's DPIA/FRIA duty. FRIA under the EU AI Act remains a separate assessment from GDPR DPIA even where evidence can be cross-referenced.

## Current determination

```text
CNPD_DPIA_GUIDANCE=VERIFIED_2026-09-09
CNPD_REGULATION_798_2018=REFERENCE_VERIFIED
DPIA_SCREENING=PASS
DPIA_REQUIRED=UNCERTAIN
PROVIDER_SIDE_HIGH_RISK_TRIGGER=NOT_PROVEN
CUSTOMER_SPECIFIC_DPIA=OUTSIDE_THIS_GLOBAL_SCREENING
```

Why `UNCERTAIN`: the screening itself is complete enough to show no current proven automatic trigger, but enterprise-grade closure still needs factual confirmation of scale, accepted special-category data, monitoring configuration and any AI-assisted processing involving individuals.

If those facts confirm likely high risk, a structured DPIA must be completed before the relevant processing is treated as fully closed. If residual high risk remains after mitigation, prior-consultation obligations must not be self-closed.