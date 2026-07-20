# EU AI Act Article 5 prohibited-practices assessment

## Scope

This control adds a deterministic, versioned and fail-closed assessment for the eight prohibited-practice signal families represented in Article 5 of Regulation (EU) 2024/1689.

The assessment is integrated into the shared AI inventory payload path. A positive detailed signal promotes the canonical inventory decision to `prohibited_review` / `block_and_escalate`, even when the legacy broad `manipulativeOrExploitative` field is false.

## Decision states

- `clear`: every signal was explicitly answered `no`;
- `review_required`: at least one answer is missing or `unknown` and no positive signal exists;
- `blocked_pending_legal_review`: at least one signal is explicitly positive.

A `clear` result is decision support only. It is not a legal determination, certification or compliance guarantee.

## Covered signal families

1. Subliminal, purposefully manipulative or deceptive techniques.
2. Exploitation of age, disability or social/economic vulnerability.
3. Prohibited social scoring.
4. Individual criminal-offence risk prediction based solely on profiling or traits.
5. Untargeted scraping of facial images.
6. Emotion inference in workplace or education contexts.
7. Biometric categorisation used to infer sensitive traits.
8. Real-time remote biometric identification in publicly accessible spaces for law-enforcement purposes.

## Evidence and operational behaviour

For every positive or unknown signal, the engine emits bounded evidence requirements and actions. Positive findings require production rollout to remain blocked until an accountable legal/compliance decision is recorded. Unknown findings prevent the questionnaire from being represented as complete.

The result contains:

- assessment version;
- disposition;
- production-block flag;
- legal-review flag;
- positive and unknown signal identifiers;
- Article references and rationale;
- required evidence;
- required actions;
- an explicit evidence boundary.

## Validation

The implementation includes unit coverage for all dispositions, tri-state normalisation, Article references and required actions, plus an inventory integration contract proving that detailed positive signals reach the canonical decision metadata.

Runtime deployment, production data migration and external legal validation are not claimed by this repository change. Required CI checks on the exact PR head remain authoritative.

