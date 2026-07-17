# CSV export audit row-count integrity

## Status

Accepted for review.

## Context

The risks, tasks, and vendors CSV export routes build a `rows` array containing one header row followed by exported records. Their audit metadata previously stored `rows.length`, which counted the header as if it were an exported business record. This produced an off-by-one audit value for every successful export, including a value of one for a valid empty export.

For enterprise evidence and incident review, audit metadata must describe business records accurately and must not inflate export volumes.

## Decision

Each affected route derives `exportedRowCount` directly from the successfully returned database data and records that value in `report.export` audit metadata. The CSV response remains unchanged and still includes its header row.

A source regression contract covers the three routes and rejects reintroduction of `rows.length` as the audit count.

## Consequences

- Audit metadata now records zero for an empty export and the exact number of exported business records otherwise.
- Existing tenant scoping, authorization, entitlement checks, rate limits, error handling, file names, and CSV layouts remain unchanged.
- Historical audit rows are not rewritten.
- This decision does not prove production audit-log delivery, immutability, retention, or external assurance.

## Verification

Run:

```bash
npx vitest run tests/security/csv-export-audit-row-count.test.ts
```

Required GitHub Actions checks must pass on the exact PR head SHA before merge.

## Rollback

Revert the commits in the pull request. Reverting restores the known off-by-one audit metadata and should only be used if an unforeseen compatibility issue is demonstrated.
