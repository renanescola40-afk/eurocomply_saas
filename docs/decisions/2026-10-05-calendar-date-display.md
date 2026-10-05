# Preserve calendar days when displaying database DATE values

- Status: Proposed
- Date: 2026-10-05
- Scope: compliance calendar date rendering

## Context

Compliance task deadlines are persisted as database DATE values and therefore represent calendar days, not instants in time. The previous task-list and calendar-preview rendering path parsed a value such as `2026-12-20` as UTC midnight and then formatted that instant in the browser timezone. Browsers west of UTC could therefore display the preceding calendar day even though the persisted value and edit input remained correct.

The defect is presentation-only: date persistence, CSV serialization, authentication, authorization, RLS, billing, audit boundaries and database schema are unchanged.

## Decision

Use the shared `formatCalendarDate` helper for compliance deadline display. Strict `YYYY-MM-DD` values are validated as real calendar dates and formatted with `timeZone: 'UTC'`, preserving the stored calendar day in every browser timezone. Timestamp values retain the existing local-timezone behavior.

Both the compliance task list and calendar preview consume the same helper so their date semantics cannot drift independently. Missing and invalid values continue to use the existing UI fallback labels.

## Risks and trade-offs

Treating date-only values in UTC is intentionally different from timestamp rendering. Future callers must preserve that distinction rather than using this helper to reinterpret timestamps as calendar dates. The helper also rejects nonexistent dates that JavaScript would otherwise normalize, which is stricter than raw `new Date(value)` behavior.

The implementation adds a small shared utility dependency between two UI surfaces, but removes duplicated date parsing and makes the behavior directly testable. No timezone offset workaround or persisted-data rewrite is introduced.

## Tests and evidence

Focused regression coverage verifies four deadlines across UTC, America/Los_Angeles, Pacific/Honolulu, Europe/Lisbon and Asia/Tokyo, plus leap-day, invalid-date, missing-value and timestamp semantics. Exact-head CI and CodeQL remain authoritative for repository validation; production acceptance still requires create/edit/reload and CSV verification on the deployed SHA.

## Rollback

Revert the shared formatter and the two consumer changes together. No database, schema, configuration, customer-data or credential rollback is required because persistence and serialization are unchanged.
