# Preserve calendar days when displaying database DATE values

- Status: Proposed
- Date: 2026-10-05

## Context

A task deadline is a database DATE, not an instant. Parsing YYYY-MM-DD as UTC midnight and formatting it in a browser west of UTC displayed the previous day. The edit control and persisted value could remain correct while the list was wrong.

## Decision

Format date-only values in UTC to preserve their calendar day. Keep timestamp formatting in the existing local timezone, preserve locale and missing/invalid labels, and reject nonexistent dates that JavaScript otherwise normalizes. The task table and calendar preview share this bounded formatter. Inputs, database writes, exports, authentication, and authorization are unchanged.

## Risks and trade-offs

Timestamp and date-only semantics intentionally differ. Invalid dates return the existing invalid label. The production deadline workflow remains unverified until deployment. No persisted dates are rewritten.

## Verification

Regression tests cover four deadlines in five timezones, a leap day, invalid dates, missing dates, and timestamp behavior. React review: direct helper import; no new effects, hooks, requests, serialization, markup, or access-control changes.

## Rollback

Revert the shared formatter and its two consumers. No data or schema rollback is necessary. Production acceptance requires create/edit/reload and CSV verification on the deployed SHA; local tests alone do not close the manual journey.
