# RISCK COMPLY — Current Legal Authority Index V1

Date: 2026-09-14
Product: RISCK COMPLY
Repository: renanescola40-afk/eurocomply_saas
Current main after legal applicability merge: 9fb761501a7d1cb5d7ea8230f7fc73ddda2b86e9
Current canonical Production: dpl_BznNuFKG8UEh4yW8y9HQyzLXDiJ9 / 13b19410caa20045b19d98d58df406c43433af5a

## Authority rule

For current legal decisions use this order:

1. applicable EU and Portuguese law;
2. current official Commission, AI Office, EDPB, CNPD or other competent-authority material;
3. accepted Production functionality;
4. current protected main;
5. current Production release;
6. attributable company/provider/account evidence;
7. this index and the current applicability/feature artifacts;
8. attributable evidence comments;
9. old issue bodies;
10. historical chat assumptions.

An older issue or document cannot reopen a current closed or N/A determination without new law, a changed feature, changed processing, a changed provider/account fact, a customer requirement or attributable contradictory evidence.

## Canonical current artifacts

| Artifact | Status | Authority use |
|---|---|---|
| docs/legal-assurance/LEGAL_APPLICABILITY_MATRIX_V2_2026-09-14.md | CURRENT | Canonical legal applicability, AI Act workstream classification and GDPR/ePrivacy/provider/company gap matrix |
| docs/legal-assurance/RISCK_COMPLY_REGULATORY_FEATURE_INVENTORY_V1_2026-09-14.md | CURRENT | Canonical accepted-release feature and runtime boundary |
| docs/legal-assurance/LEGAL_LAUNCH_SCORECARD_V1_2026-09-14.md | CURRENT | Current scorecard, blockers, owner actions and terminal states |
| tests/legal-applicability-matrix.test.ts | CURRENT | Regression guard for the above authority |

## Superseded or historical material

| Material | Status | Treatment |
|---|---|---|
| docs/legal-assurance/BG_LEGAL_QUICKSCAN_RECONCILIATION_2026-09-14.md | HISTORICAL_EVIDENCE | Retain both self-reported Quickscan outputs; current feature inventory resolves the conflict by accepted-release facts |
| docs/enterprise/ENTERPRISE_CLOSURE_CONTROLLER_V2_2026-09-14.md | SUPERSEDED_FOR_CURRENT_LEGAL_SCORE | Retain technical and assurance history; current legal score and applicability come from the V2 matrix and scorecard |
| docs/LEGAL_READINESS.md | SUPERSEDED_FOR_CURRENT_LEGAL_SCORE | Retain historical readiness language; do not use old human-review percentages as statutory conclusions |
| docs/legal-review-preparation/** | OPTIONAL_ASSURANCE_PREPARATION | Review packages remain available for a buyer, counsel or a future trigger; preparation is not accepted legal evidence |
| docs/compliance/evidence/accepted/** | EXTERNAL_DEPENDENCY | Empty/missing accepted evidence does not prove that a qualified reviewer is legally required; it proves that the optional assurance artifact has not been supplied |
| Public Privacy, Terms, DPA, cookie, transfer and subprocessor pages | CURRENT_REVIEW_DRAFTS | Public informational surfaces remain conservative until factual and contractual closure; they are not final effective legal instruments |
| Old issue bodies and historical chat trackers | HISTORICAL | Use only as leads; verify against current law, product and attributable evidence |

## Current legal states

- Current-release AI Act applicability: CLOSED_BY_APPLICABILITY for the bounded deterministic release.
- Historical eight AI Act workstreams: CLOSED_NOT_APPLICABLE_CURRENT_RELEASE with recorded change triggers.
- Legal 8/8 human reviews: 0/8; this is not a statutory failure for the bounded release.
- Master Legal Opinion: OPTIONAL_ENTERPRISE_ASSURANCE_OPEN.
- General legal launch: NO_PASS while entity, privacy, DPA, provider/transfer, ePrivacy and commercial publication facts remain open.
- Buyer-specific procurement controls: WAITING_BUYER unless a named customer imposes them.

## Reopen/change triggers

Reopen the applicable artifact before publication or release when:

- a model, chatbot, assistant, synthetic-content or AI API runtime is added;
- the product makes decisions about natural persons or enters a high-impact regulated use;
- customer data categories, controller/processor roles, retention or regions change;
- a provider, subprocessor, transfer mechanism, analytics path or email/marketing purpose changes;
- the seller, registered office, VAT/CAE facts or contracting flow changes;
- a competent authority, customer or qualified reviewer supplies attributable contradictory evidence;
- the accepted Production SHA changes materially.

## Evidence boundary

This index is governance metadata, not a legal opinion, certification, regulator approval, notified-body assessment or customer-specific acceptance.