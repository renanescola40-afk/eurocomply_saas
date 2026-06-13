# Final security readiness JSON contract

Date: 2026-06-13
Status: operational contract

## Context

`npm run security:final-readiness:report` writes `final-security-readiness.json` for GitHub Actions artifacts and future automation.

The report is warning-only in CI until the project has:

1. a reviewed `package-lock.json`,
2. an `npm-audit.json` generated with the pinned npm runtime,
3. no floating dependency specs, and
4. no unresolved audit findings.

## Current artifact location

The Security CI workflow uploads the file in the `npm-audit-triage` artifact together with:

- `npm-audit.json`
- `npm-audit-summary.md`
- `final-security-readiness.md`

## JSON shape

The report must remain a JSON object with these fields:

```json
{
  "status": "blocked",
  "generatedAt": "2026-06-13T00:00:00.000Z",
  "command": "npm run security:final-readiness",
  "exitCode": 1,
  "stdout": "...",
  "stderr": "..."
}
```

### Field contract

- `status`: `ok` when the readiness command exits with `0`; otherwise `blocked`.
- `generatedAt`: ISO timestamp generated when the report is written.
- `command`: always `npm run security:final-readiness`.
- `exitCode`: numeric exit status from the readiness command.
- `stdout`: captured standard output from the readiness command.
- `stderr`: captured standard error from the readiness command.

## Consumer guidance

Automation should treat any `status` other than `ok` as not release-ready.

For now, consumers should parse human-readable blockers from `stderr`. A future enhancement can add structured `blockers[]` once executable validation changes are allowed by the repository connector.

## CI policy

Do not make this report blocking until the lockfile and audit artifact are committed or otherwise available in the run. The current intent is visibility, not release gating.
