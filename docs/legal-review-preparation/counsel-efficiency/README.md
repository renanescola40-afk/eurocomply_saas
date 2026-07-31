# Counsel Review Efficiency Closeout

**Status:** `READY_FOR_COUNSEL_PREPARATION` · `HUMAN_REVIEW_REQUIRED`

## Purpose

This package reduces counsel discovery and re-review time without converting AI preparation, repository completeness, CI success or founder self-attestation into legal acceptance.

It supplements the existing legal truth baseline, eight qualified-review packages, contract/privacy drafts and final publication gate. It does not replace any of those controls.

## What this layer adds

1. a ten-minute counsel cockpit;
2. a canonical decision catalogue covering global and workstream decisions;
3. material-change classification so counsel can review only affected scope;
4. a complete partner-counsel agreement review draft;
5. confidentiality, privilege and evidence-handling rules;
6. deterministic delta artifacts bound to the base and head SHAs;
7. fail-closed tests preventing AI-generated acceptance.

## Required counsel actions

Counsel remains responsible for:

- professional identity and standing;
- conflicts and independence;
- scope acceptance;
- legal interpretation;
- findings and conditions;
- approval, rejection or changes requested;
- signed decision references;
- validity period and reliance limitations.

## Non-crediting boundary

The following never count as legal acceptance:

- this folder;
- generated delta reports;
- decision templates;
- an AI pre-review;
- founder completion of factual fields;
- passing tests or workflows;
- silence or failure to respond;
- a commercial partnership.

Only the existing exact-SHA legal publication gate may recognise genuine accepted decisions.

## Review flow

1. Freeze the candidate product SHA.
2. Generate the canonical counsel handoff bundle.
3. Generate the counsel delta against the last reviewed SHA.
4. Counsel reviews the cockpit and affected packages.
5. Engineering remediates findings.
6. Regenerate the delta.
7. Counsel re-reviews only material affected scope.
8. Store confidential signed records outside the public repository.
9. Reference immutable digests through the accepted-evidence gate.

## Files

- `COUNSEL_REVIEW_COCKPIT.md`: concise reading order and decisions.
- `COUNSEL_DECISION_CATALOG.json`: machine-readable decision and change-impact model.
- `CHANGE_IMPACT_POLICY.md`: when full, limited or no counsel re-review is required.
- `PARTNER_COUNSEL_AGREEMENT_REVIEW_DRAFT.md`: full collaboration draft with no fee-sharing assumption.
- `CONFIDENTIALITY_AND_PRIVILEGE_PROTOCOL.md`: handling rules for legal-review material.
- `manifest.json`: non-crediting package inventory.

## Truth statement

Repository preparation can be 100% while human legal acceptance remains 0%. Customer-specific compliance and formal conformity remain separate assessments.