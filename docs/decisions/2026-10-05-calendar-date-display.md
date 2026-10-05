# Preserve calendar days when displaying database DATE values

Status: proposed; production verification pending.

A task deadline is a database DATE, not an instant. Parsing YYYY-MM-DD as UTC midnight and formatting it in a browser west of UTC displayed the previous day. The edit control and persisted value could remain correct while the list was wrong.

Format date-only values in UTC to preserve their calendar day. Keep timestamp formatting in the existing local timezone, preserve locale and missing/invalid labels, and reject nonexistent dates that JavaScript otherwise normalizes. The task table and calendar preview share this bounded formatter. Inputs, database writes, exports, authentication, and authorization are unchanged.

Regression tests cover four deadlines in five timezones, a leap day, invalid dates, missing dates, and timestamp behavior. React review: direct helper import; no new effects, hooks, requests, serialization, markup, or access-control changes.

Rollback: revert the shared formatter and its two consumers. No data or schema rollback is necessary. Production acceptance requires create/edit/reload and CSV verification on the deployed SHA; local tests alone do not close the manual journey.
