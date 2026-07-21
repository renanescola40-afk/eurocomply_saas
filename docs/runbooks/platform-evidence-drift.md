# Platform evidence drift monitor

## Purpose

Keep the final platform closeout honest after it reaches PASS. The scheduled workflow fails when the retained final evidence expires, loses exact-SHA consistency or contains a non-PASS lane.

## Protected environment

Reuse `production-platform-closeout`.

Secret:

- `PLATFORM_FINAL_RELEASE_EVIDENCE_JSON`: the latest redacted final evidence pack.

Variable:

- `PLATFORM_EVIDENCE_WARN_HOURS`: warning window before expiry; recommended `72`.

## Behaviour

- runs daily and on demand;
- never uploads the protected source JSON;
- emits a redacted drift report;
- returns `NO_GO` for expired, malformed or SHA-drifted evidence;
- returns `WARN` when evidence approaches expiry;
- returns `PASS` only while all lanes remain valid.

## Renewal

When the monitor warns or fails, re-run the underlying provider and deployment proofs against the exact current production SHA, rebuild the final release evidence pack, replace the protected secret and run the drift workflow again.

## Boundary

This control preserves platform evidence freshness. It does not create provider transactions, deploy code or prove the entire SaaS enterprise-ready.
