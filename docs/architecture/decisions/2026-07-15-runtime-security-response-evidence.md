# Derive security response evidence from the exact-SHA deployment smoke

Date: 2026-07-15  
Status: Proposed

## Context

The enterprise scorecard expects runtime evidence for security headers and `Cache-Control: no-store`. The production deployment smoke already tests these behaviors against the configured deployment target, but its results were retained only inside `deployment-smoke-validation.json`. The scorecard therefore reported SEC-05 and SEC-06 as missing even after the release runner had performed the relevant network checks.

Creating manually authored `Complete` files would introduce stale-evidence risk. Reclassifying the controls as repository-only checks would also be inaccurate because source inspection does not prove the deployed response behavior.

## Decision

After the deployment smoke and runtime SHA verification complete, the release orchestrator derives two narrow evidence documents:

- `security-headers-validation.json` from `securityHeadersPresent` on every validated target;
- `no-store-validation.json` from both `sensitiveApisHaveNoStore` and `privateRoutesHaveNoStore` on every validated target.

Derivation fails closed unless:

- the source deployment smoke is `Complete` and `passed`;
- the source was generated within the configured freshness window;
- the source contains at least one deployment target;
- the source commit SHA exactly matches `RELEASE_COMMIT_SHA` or `GITHUB_SHA`;
- every required target-level check explicitly passed.

The output records only the expected SHA, source timestamp, target count, target URLs already present in the smoke evidence, and boolean check outcomes. It does not copy response bodies, authorization values, cookies, secrets, or customer data.

## Consequences

A successful protected production validation can now provide the exact evidence paths already required by SEC-05 and SEC-06. The score does not increase merely because this code is merged; the files remain absent until a fresh target-environment run succeeds.

A failed, stale, empty, or SHA-mismatched smoke prevents both evidence documents from becoming complete and fails the release command.

## Evidence boundary

This proves the tested deployment returned the configured security headers and `no-store` behavior for the routes covered by the smoke at one point in time and on one exact SHA. It does not replace DAST, external review, authenticated BOLA/IDOR testing, WAF validation, browser-wide cache analysis, or continuous production monitoring.

## Rollback

Revert the release evidence writer, its orchestrator invocation, workflow artifact paths, tests, and this decision record. SEC-05 and SEC-06 return to `NOT_VERIFIED` unless equivalent fresh runtime evidence is produced.
