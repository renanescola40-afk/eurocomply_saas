# SEC-05 client-side environment reference detection (2026-11-03)

Status: Proposed

## Context

The existing `scripts/security/check-client-boundaries.mjs` only matched direct `process.env.SERVER_SECRET` accesses and ran in report-only mode unless an optional environment flag was set. As a result, bracket access, destructuring, computed access and optional chaining could avoid detection, and even detected findings could exit with code 0 in the default security CI invocation.

## Decision

Fail closed on any client-boundary `process.env` access that is not a direct, static `process.env.NEXT_PUBLIC_*` property. Do not rely on optional flags to make the scanner fail for findings. The check remains source-level defense-in-depth; no claim is made that all client bundles or runtime logs have been scanned.

## Risks and trade-offs

No runtime application or database code is changed. False positives in client-source strings or comments may need targeted parser-level refinement; any adjustment must preserve the fail-closed guarantee.

## Validation

Run `node --test tests/security/client-env-access.test.mjs`, then the full source/security/CI suites on the accepted SHA before merge.

## Rollback

Revert this isolated change if a validated false positive prevents a legitimate build, and correct the analysis rather than relaxing the gate.

## Gate and release boundary

The local guard change does **not** close G1 atomic `SEC-05` or formal gate `A-04`. Required independent evidence remains: complete repository/history secret scanner; built client bundle and log checks; provider production configuration and at-rest encryption attestations; public edge transport settings/retest; current exact-SHA CI results; qualified reviewer acceptance. Current state remains `NOT_VERIFIED` until evidence is accepted. No production writes, paid CI triggers, deployed changes or main merges are authorized by this document.

## V20 follow-up: aliased process object bypass

Reproduction against the exact prior script blob `f7e39747cf2c463b0e6a4f06c2c5717163a032e7` showed that `const runtime = process; runtime.env.SECRET`, `const { env } = process`, and `globalThis["process"]["env"].SECRET` produced zero findings. The original regex saw only a literal `process.env` sequence.

The client-boundary detector now uses the existing development dependency `typescript` to parse JS/TS/TSX and allow only directly named, explicitly approved `process.env.NEXT_PUBLIC_*` access. Process-object aliasing, destructuring, bracket indirection and optional access fail closed; comments, string literals, domain-object `.process` properties and plain object keys are not interpreted as executable global access. No additional dependency or production change is introduced.

Isolated replay: the 23 original tests passed against byte-for-byte reconstructed prior source; the patched three blobs were byte-matched against the isolated test workspace, and the combined suite produced **37/37 PASS** with local Node 22.16.0 and TypeScript 5.8.3. This is not a full repository test, TypeScript 6 verification, installed dependency validation, deployed-bundle scan or exact-SHA CircleCI acceptance. A local reconstruction is evidence only for those three blobs.

The parser remains a conservative source guard, not a taint engine: arbitrarily computed `Reflect`/`eval`/multi-hop aliases or imported client dependencies may require additional analysis. Required next checks on the final commit: `npm ci --ignore-scripts --no-audit --no-fund`, `npm run security:client-boundaries`, `npm run security:public-secrets`, `npm run security:ci`, `npm run typecheck`, `npm test`, `npm run build` and reviewed emitted-client-bundle inspection. No Enterprise PASS or authorization to merge follows from the isolated replay.

## V20.2 compatibility reconciliation — analytics public names

Canonical release candidate #2598 at observed SHA `c6ea11e6d0a314711780e444a10256745b6f8169` has five approved NEXT_PUBLIC_ analytics variables in both `scripts/security/check-public-secrets.mjs` and its older regex client scanner. PR #2600's new syntax-aware scanner initially omitted these names, risking an unnecessary fail-closed security CI failure on legitimate client analytics code. The production app already references `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_ANALYTICS_REQUIRE_CONSENT` in client-facing analytics modules.

This follow-up adds only the five candidate-approved analytics names to both source allowlists, preserving denial for bracket access and any unapproved `NEXT_PUBLIC_*` names. Six additional isolated tests cover each approved name and a synthetic private analytics name with a public prefix denied; they do not authorize secrets with a public prefix. The local byte-identified Node 22.16.0 / TypeScript 5.8.3 isolated suite now passes **43/43** tests. Full-repo TypeScript 6/CI checks, client-bundle scanning, qualified review and formal acceptance remain NOT_EXECUTED / NOT_VERIFIED.

## Rollback

If a verified parser false positive blocks legitimate client code, revert the isolated scanner adjustment through a governed, reviewed PR. Restore an accurately scoped parser-level fix while preserving fail-closed handling of sensitive client environment accesses. Neither this decision record nor a rollback authorizes bypassing source-security checks or writing to production.

## Risks and trade-offs

The conservative parser may reject legitimate but unusual indirect accesses and therefore require additional regression fixtures. It also cannot establish that emitted client bundles, logs, provider encryption, and historical Git objects are free of exposures. These additional controls must be independently tested; current SEC-05 and A-04 acceptance remain NOT_VERIFIED.

