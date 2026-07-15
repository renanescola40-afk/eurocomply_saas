# Derive security response evidence from the exact-SHA deployment smoke

Date: 2026-07-15  
Status: Proposed

## Context

The enterprise scorecard expects runtime evidence for security headers and `Cache-Control: no-store`. The production deployment smoke already tests these behaviors against the configured deployment target, but its results were retained only inside `deployment-smoke-validation.json`. The scorecard therefore reported SEC-05 and SEC-06 as missing even after the release runner had performed the relevant network checks.

Creating manually authored `Complete` files would introduce stale-evidence risk. Reclassifying the controls as repository-only checks would also be inaccurate because source inspection does not prove deployed response behavior.

## Decision

Before either strict release runner starts, the release orchestrator:

1. verifies through the protected runtime metadata endpoint that the hostname serves the exact release SHA;
2. executes a fresh deployment smoke against that hostname;
3. derives two narrow evidence documents;
4. starts the broader public or enterprise runner, whose strict evidence gates can now consume those documents;
5. verifies the runtime SHA again after the broader runner completes.

The derived documents are:

- `security-headers-validation.json` from `securityHeadersPresent` on every validated target;
- `no-store-validation.json` from both `sensitiveApisHaveNoStore` and `privateRoutesHaveNoStore` on every target.

Derivation fails closed unless:

- protected runtime SHA evidence is `Complete/passed` and its expected and observed SHA equal the release SHA;
- the source deployment smoke is `Complete/passed`;
- the smoke was generated within the configured freshness window;
- the smoke contains at least one deployment target;
- the smoke commit SHA exactly matches the release SHA;
- every required target-level check explicitly passed.

The protected `Public Production Final` job recalculates the enterprise scorecard after the release command, using the generated runtime documents and exact-SHA GitHub checks in the same workspace. The resulting scorecard and runtime evidence are retained together for 90 days.

## Consequences

A successful protected production validation can now provide the exact evidence paths required by SEC-05 and SEC-06. The score does not increase merely because this code is merged; the files remain absent until a fresh target-environment run succeeds.

The deployment smoke and runtime SHA verification run once before and once within or after the broader validation path. This deliberate duplication prioritizes fail-closed ordering and final-state confirmation; it may be consolidated later only if the strict runners expose an equivalent ordered hook.

A failed, stale, empty, runtime-unbound, or SHA-mismatched smoke prevents both evidence documents from becoming complete and fails the release command.

## Evidence boundary

This proves the tested deployment returned the configured security headers and `no-store` behavior for the covered routes at one point in time and on one exact SHA. It does not replace DAST, external review, authenticated BOLA/IDOR testing, WAF validation, browser-wide cache analysis, or continuous production monitoring.

## Rollback

Revert the release evidence writer, its orchestrator invocation, protected workflow scorecard steps, artifact paths, tests, and this decision record. SEC-05 and SEC-06 return to `NOT_VERIFIED` unless equivalent fresh runtime evidence is produced.
