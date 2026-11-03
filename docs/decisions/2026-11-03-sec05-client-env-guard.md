# SEC-05 client-side environment reference detection (2026-11-03)

## Context and observed defect

The existing `scripts/security/check-client-boundaries.mjs` only matched direct `process.env.SERVER_SECRET` accesses and ran in report-only mode unless an optional environment flag was set. As a result, bracket access, destructuring, computed access and optional chaining could avoid detection, and even detected findings could exit with code 0 in the default security CI invocation.

## Decision

Fail closed on any client-boundary `process.env` access that is not a direct, static `process.env.NEXT_PUBLIC_*` property. Do not rely on optional flags to make the scanner fail for findings. The check remains source-level defense-in-depth; no claim is made that all client bundles or runtime logs have been scanned.

## Safety and compatibility

No runtime application or database code is changed. False positives in client-source strings or comments may need targeted parser-level refinement; any adjustment must preserve the fail-closed guarantee. Run `node --test tests/security/client-env-access.test.mjs`, then the full source/security/CI suites on the accepted SHA before merge. Revert this isolated change if a validated false positive prevents a legitimate build, and correct the analysis rather than relaxing the gate.

## Gate and release boundary

The local guard change does **not** close G1 atomic `SEC-05` or formal gate `A-04`. Required independent evidence remains: complete repository/history secret scanner; built client bundle and log checks; provider production configuration and at-rest encryption attestations; public edge transport settings/retest; current exact-SHA CI results; qualified reviewer acceptance. Current state remains `NOT_VERIFIED` until evidence is accepted. No production writes, paid CI triggers, deployed changes or main merges are authorized by this document.
