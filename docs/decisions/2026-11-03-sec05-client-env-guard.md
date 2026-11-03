# SEC-05 client-side environment reference detection (2026-11-03)

## Context and observed defect

The existing `scripts/security/check-client-boundaries.mjs` only matched direct `process.env.SERVER_SECRET` accesses and ran in report-only mode unless an optional environment flag was set. As a result, bracket access, destructuring, computed access and optional chaining could avoid detection, and even detected findings could exit with code 0 in the default security CI invocation.

## Decision

Fail closed on any client-boundary `process.env` access that is not a direct, static `process.env.NEXT_PUBLIC_*` property. Do not rely on optional flags to make the scanner fail for findings. The check remains source-level defense-in-depth; no claim is made that all client bundles or runtime logs have been scanned.

## Safety and compatibility

No runtime application or database code is changed. False positives in client-source strings or comments may need targeted parser-level refinement; any adjustment must preserve the fail-closed guarantee. Run `node --test tests/security/client-env-access.test.mjs`, then the full source/security/CI suites on the accepted SHA before merge. Revert this isolated change if a validated false positive prevents a legitimate build, and correct the analysis rather than relaxing the gate.

## Gate and release boundary

The local guard change does **not** close G1 atomic `SEC-05` or formal gate `A-04`. Required independent evidence remains: complete repository/history secret scanner; built client bundle and log checks; provider production configuration and at-rest encryption attestations; public edge transport settings/retest; current exact-SHA CI results; qualified reviewer acceptance. Current state remains `NOT_VERIFIED` until evidence is accepted. No production writes, paid CI triggers, deployed changes or main merges are authorized by this document.

## V20 follow-up: aliased process object bypass

Reproduction against the exact prior script blob `f7e39747cf2c463b0e6a4f06c2c5717163a032e7` showed that `const runtime = process; runtime.env.SECRET`, `const { env } = process`, and `globalThis["process"]["env"].SECRET` produced zero findings. The original regex saw only a literal `process.env` sequence.

The client-boundary detector now uses the existing development dependency `typescript` to parse JS/TS/TSX and allow only directly named, explicitly approved `process.env.NEXT_PUBLIC_*` access. Process-object aliasing, destructuring, bracket indirection and optional access fail closed; comments, string literals, domain-object `.process` properties and plain object keys are not interpreted as executable global access. No additional dependency or production change is introduced.

Isolated replay: the 23 original tests passed against byte-for-byte reconstructed prior source; the patched three blobs were byte-matched against the isolated test workspace, and the combined suite produced **37/37 PASS** with local Node 22.16.0 and TypeScript 5.8.3. This is not a full repository test, TypeScript 6 verification, installed dependency validation, deployed-bundle scan or exact-SHA CircleCI acceptance. A local reconstruction is evidence only for those three blobs.

The parser remains a conservative source guard, not a taint engine: arbitrarily computed `Reflect`/`eval`/multi-hop aliases or imported client dependencies may require additional analysis. Required next checks on the final commit: `npm ci --ignore-scripts --no-audit --no-fund`, `npm run security:client-boundaries`, `npm run security:public-secrets`, `npm run security:ci`, `npm run typecheck`, `npm test`, `npm run build` and reviewed emitted-client-bundle inspection. No Enterprise PASS or authorization to merge follows from the isolated replay.
