# Intended Purpose

## Formal statement

Risck Comply is intended to help organisations organise AI-governance facts, systems, responsibilities, evidence, tasks, assessments, versioned regulatory rules and review workflows. It supports readiness analysis and preparation of documentation for internal management, professional advisers, auditors, procurement teams and competent external procedures.

The product may apply deterministic rules, request customer facts, identify missing evidence, calculate operational readiness indicators, propose classifications, generate draft documentation and create remediation tasks. These outputs are decision support and evidence preparation only.

Risck Comply is not intended to make autonomous final legal decisions, provide a legal guarantee, replace a lawyer, replace a notified body, authorise CE marking, certify a customer, determine regulatory approval or represent a customer before an authority.

## Permitted use

- maintaining an inventory of AI systems and providers;
- recording intended purpose, deployment context, legal roles and risk signals;
- preparing prohibited-practice, transparency, FRIA, deployer, provider, conformity and GPAI reviews;
- mapping controls, tests, runtime evidence and human-review boundaries;
- creating tasks, approvals, reports and audit trails;
- preparing customer material for qualified review;
- recording internal management attestations separately from independent review.

## Prohibited or restricted use

The product must not be used as the sole basis for final decisions concerning employment, credit, education, essential services, law enforcement, migration, biometric identification, emotion recognition, health, safety or other sensitive/high-risk contexts. It must not present a readiness score as proof of legal compliance.

Any feature that generates or suggests classifications must preserve uncertainty, evidence requirements, role-specific conditions, national-law dependencies and qualified-review escalation.

## Output hierarchy

1. `AUTOMATED_READINESS_ASSESSMENT`
2. `EVIDENCE_COMPLETENESS`
3. `INTERNAL_MANAGEMENT_ATTESTATION`
4. `INDEPENDENT_PROFESSIONAL_REVIEW`
5. `FORMAL_CONFORMITY_ASSESSMENT` when applicable
6. `CUSTOMER_SPECIFIC_FINAL_DECISION`

The platform must never collapse these levels into one generic “compliant” result.

## Version block

- `INTENDED_PURPOSE_VERSION`: `2026-07-30.1`
- `INTENDED_PURPOSE_SHA256`: `PENDING_FINAL_BRANCH_DIGEST`
- `PRODUCT_VERSION`: `0.1.0`
- `SOURCE_CODE_SHA`: `fbc61f3a5f069c23f9bc307789d12a53b5f87d34`
- `APPROVED_BY_PRODUCT_OWNER`: `PENDING_FOUNDER_CONFIRMATION`
- `LEGAL_REVIEW_STATUS`: `HUMAN_REVIEW_REQUIRED`

## Change control

A new legal review is required when there is a material change to:

- product intended purpose;
- AI model/provider or model behaviour;
- automated decision authority;
- customer population or sector;
- supported legal role;
- data flow or sensitive-data handling;
- public claims;
- high-risk, prohibited-practice, transparency, FRIA, GPAI or conformity logic.
