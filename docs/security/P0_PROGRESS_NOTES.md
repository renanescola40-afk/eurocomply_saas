# P0 Progress Notes

## 2026-06-16 — Floating dependency specs removed from package.json

Commit `33b8c5898aec1d0d6858aae0172d5de8ccb9d0a3` removed the remaining `latest` dependency specs from `package.json`.

Pinned values:

- `@emotion/is-prop-valid`: `1.4.0`
- `framer-motion`: `12.40.0`
- `vaul`: `1.1.2`

Impact:

- P0 repo readiness should move from 5/7 to 6/7 after the progress reporter runs.
- P0 combined should move from 5/12 to 6/12 after the progress reporter runs.
- `package-lock.json` remains the final open repo-readiness P0 blocker.

Remaining P0 technical blocker:

- Generate, review, and commit `package-lock.json` from the `P0 Lockfile Plan` workflow artifacts.

Review rule:

- Do not mark deterministic lockfile readiness complete until `package-lock.json` is committed and reviewed.
