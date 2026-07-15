# Derive security response evidence from the exact-SHA deployment smoke

Date: 2026-07-15  
Status: Proposed

## Context

The enterprise scorecard expects runtime evidence for security headers and `Cache-Control: no-store`. The production deployment smoke already tests these behaviors against the configured deployment target, but its results were retained only inside `deployment-smoke-validation.json`. The scorecard therefore reported SEC-05 and SEC-06 as missing even after the release runner had performed the relevant network checks.

Creating manually authored `Complete` files would introduce stale-evidence risk. Reclassifying the controls as repository-only checks would also be inaccurate because source inspection does not prove deployed response behavior.

## Decision

After the public or enterprise release runner completes its final deployment smoke, the release orchestrator:

1. verifies through the protected runtime metadata endpoint that the hostname serves the exact release SHA;
2. derives two narrow evidence documents from the final smoke and protected SHA proof;
3. fails the release command if either document cannot be completed;
4. lets the protected `Public Production Final` job recalculate the enterprise scorecard in the same workspace.

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

The protected job retains the generated runtime documents, exact-SHA GitHub checks, release logs, and resulting scorecard together for 90 days.

## Consequences

A successful protected production validation can now provide the exact evidence paths required by SEC-05 and SEC-06. The score does not increase merely because this code is merged; the files remain absent until a fresh target-environment run succeeds.

Security-response evidence is derived from the final smoke artifact rather than from a preliminary duplicate request sequence. This keeps the uploaded evidence bundle internally coherent and avoids unnecessary provider traffic.

A failed, stale, empty, runtime-unbound, or SHA-mismatched smoke prevents both evidence documents from becoming complete and fails the release command even if earlier repository checks passed.

## Evidence boundary

This proves the tested deployment returned the configured security headers and `no-store` behavior for the covered routes at one point in time and on one exact SHA. It does not replace DAST, external review, authenticated BOLA/IDOR testing, WAF validation, browser-wide cache analysis, or continuous production monitoring.

## Rollback

Revert the release evidence writer, its orchestrator invocation, protected workflow scorecard steps, artifact paths, tests, and this decision record. SEC-05 and SEC-06 return to `NOT_VERIFIED` unless equivalent fresh runtime evidence is produced.
