# EU AI Act Runtime Evidence Campaign

## Purpose

Convert implemented and CI-verified product workstreams into exact-SHA runtime evidence without treating code presence as production proof.

## Preconditions

- merge target is the current `main` SHA;
- protected environment `production-eu-ai-act-runtime-evidence` exists;
- required provider and runtime proof workflows have completed;
- evidence JSON files are sanitized and contain the exact assessed SHA;
- no customer data or secret values are committed.

## Execution

Run **EU AI Act Runtime Evidence Campaign** manually with:

- `target_sha`: full current `main` SHA;
- `confirmation`: `RUN_EU_AI_ACT_RUNTIME_EVIDENCE`.

The workflow verifies the checkout and current remote `main`, runs the four final CI contracts, validates all 15 runtime evidence entries and uploads a 90-day sanitized report.

## Decisions

- `EU_AI_ACT_RUNTIME_EVIDENCE_READY`: every weighted runtime entry is accepted for the exact SHA.
- `EU_AI_ACT_RUNTIME_NO_GO`: at least one entry is missing, stale, invalid or linked to another SHA.

The report does not claim legal compliance, certification, qualified legal review or regulator approval.

## Current acceptance order

1. Finish CI verification for all 100 product points.
2. Generate exact-SHA runtime evidence for each workstream.
3. Obtain the qualified human reviews listed by the product coverage registry.
4. Re-run Product Coverage and Enterprise Readiness closeout.
5. Declare GO only when both canonical systems permit it.
