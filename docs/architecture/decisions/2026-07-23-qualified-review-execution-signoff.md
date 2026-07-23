# ADR: Qualified Review Execution and Sign-off Boundary

## Status

Proposed.

## Context

The canonical product score can reach 100% implementation, CI and runtime coverage while remaining below full completion because eight legal and methodology reviews require qualified human judgment. Automated generation of accepted opinions would be misleading and unsafe.

## Decision

Create an exact-SHA review execution plane that generates immutable packets, validates reviewer identity and qualification, enforces independence and conflicts, requires structured answers, verifies validity windows and integrity digests, and emits only a non-mutating promotion plan.

Strict closeout runs only in the protected `qualified-legal-review` environment and requires explicit confirmation. Accepted evidence is promoted only through a separate manually reviewed PR.

## Consequences

- The repository can prove which SHA and questions were reviewed.
- Missing, conflicted, expired or failed reviews remain blocked.
- Reviewer personal data is minimized.
- Automation cannot claim legal approval or manufacture completion.
- Achieving 100% completion still requires real qualified reviewers to submit acceptable packages.
