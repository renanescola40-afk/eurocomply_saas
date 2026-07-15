# Derive security response evidence from fresh exact-SHA host validation

Date: 2026-07-15  
Status: Proposed

## Context

The enterprise scorecard expects runtime evidence for security headers and `Cache-Control: no-store`. The production deployment smoke already tests these behaviors against configured deployment targets, but its results were retained only inside `deployment-smoke-validation.json`. The scorecard therefore reported SEC-05 and SEC-06 as missing even after the release runner had performed the relevant network checks.

Creating manually authored `Complete` files would introduce stale-evidence risk. Reclassifying the controls as repository-only checks would also be inaccurate because source inspection does not prove deployed response behavior.

The first derivation design checked freshness only for the smoke artifact. It did not require the protected runtime-SHA proof to be fresh or bind every smoke target to the same protected host. A stale proof for the same commit, or one proof for a different hostname, could therefore be combined with a fresh smoke. It also copied full target URLs into the derived evidence.

## Decision

After the public or enterprise release runner completes its final deployment smoke, the release orchestrator:

1. verifies through the protected runtime metadata endpoint that one hostname serves the exact release and build SHA;
2. derives two narrow evidence documents from the final smoke and protected SHA proof;
3. fails the release command if either document cannot be completed;
4. lets the protected `Public Production Final` job recalculate the enterprise scorecard in the same workspace.

The derived documents are:

- `security-headers-validation.json` from `securityHeadersPresent` on every validated target;
- `no-store-validation.json` from both `sensitiveApisHaveNoStore` and `privateRoutesHaveNoStore` on every target.

Derivation fails closed unless:

- expected release SHA is a full 40-character value;
- the source deployment smoke is `Complete/passed`, fresh, redacted, has an empty failures array and at least one target;
- both smoke commit SHA and smoke build SHA exactly match the expected release SHA;
- protected runtime-SHA evidence has the expected schema and evidence item;
- protected runtime-SHA evidence is `Complete/passed`, fresh and redacted;
- runtime expected commit SHA, expected build SHA and observed commit SHA all equal the release SHA;
- runtime checks are present and all passed;
- runtime failures are explicitly empty;
- the runtime proof stores no raw network payload or mismatched observed SHA;
- every smoke target normalizes to the same host protected by the runtime-SHA proof;
- every required target-level response check explicitly passed.

Each target result stores only a normalized hostname. Full URLs, paths, query strings and fragments are not copied into the derived artifacts.

If multiple smoke hosts are configured, all must have an equivalent protected SHA binding. With the current single runtime-SHA artifact, any additional unbound host makes the derived evidence fail closed.

The protected job retains the generated runtime documents, exact-SHA GitHub checks, release logs, and resulting scorecard together for 90 days.

## Consequences

A successful protected production validation can provide the exact evidence paths required by SEC-05 and SEC-06. The score does not increase merely because this code is merged; the files remain absent until a fresh target-environment run succeeds.

Security-response evidence is derived from the final smoke artifact rather than from a preliminary duplicate request sequence. This keeps the uploaded evidence bundle internally coherent and avoids unnecessary provider traffic.

Headers and no-store remain independent outcomes: one control may pass while the other fails, but both require the same fresh exact-SHA host binding.

A failed, stale, empty, runtime-unbound, host-mismatched, build-mismatched or SHA-mismatched source prevents the relevant documents from becoming complete and fails the release command even if earlier repository checks passed.

## Evidence boundary

This proves the bound hostname returned the configured security headers and `no-store` behavior for the covered routes at one point in time and on one exact commit/build SHA.

It does not replace DAST, external review, authenticated BOLA/IDOR testing, WAF validation, browser-wide cache analysis, multi-region validation, provider continuity testing, or continuous production monitoring.

## Risks and trade-offs

- one protected runtime-SHA artifact currently binds one host; multi-host releases require one equivalent proof per host or a future multi-target contract;
- a 30-minute default freshness window balances workflow duration against stale-proof reuse and remains configurable only through a positive numeric environment value;
- normalized hostnames are retained as operational evidence but contain no path, query, credentials or response data;
- the derived evidence still depends on the correctness of the upstream smoke and protected runtime endpoint.

## Rollback

Revert the release evidence writer, its orchestrator invocation, protected workflow scorecard steps, artifact paths, tests, and this decision record. SEC-05 and SEC-06 return to `NOT_VERIFIED` unless equivalent fresh runtime evidence is produced.
