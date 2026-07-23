# ADR: Qualified Review Assurance Campaign

## Decision

Use a machine-readable, exact-SHA campaign to govern qualified human reviews required by the product coverage registry.

## Context

Functional implementation and CI can be automated, but legal, fundamental-rights and specialist methodology reviews require identifiable qualified people. Treating a placeholder file or merged PR as review evidence would overstate completion.

## Controls

- named reviewer and organization;
- qualification evidence and discipline;
- conflict-of-interest check;
- exact reviewed SHA;
- approved or approved-with-limitations decision;
- validity window;
- SHA-256 evidence digest;
- report mode separated from strict closure;
- read-only workflow permissions and retained artifacts.

## Consequences

Completion remains NO-GO until genuine review packages exist. The system can prioritize and validate work but cannot manufacture professional judgment or regulator approval.
