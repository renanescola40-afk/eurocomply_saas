# Phase 5 Discovery Notes

This document records the first discovery pass for Phase 5 functional implementation.

## Discovery target

Organization-scoped compliance project workflows.

## Repository search status

The initial connected code search did not return indexed matches for:

- `compliance project`
- `compliance`
- `project organization audit billing subscription`

Because the search index did not return matches, Phase 5 implementation should not assume route or module names yet.

## Next discovery method

Before runtime implementation, use repository inspection through direct file reads, local search, or CI-accessible tooling to identify:

- existing application routes;
- existing project-related modules;
- organization or tenant context helpers;
- audit-event helpers;
- billing-state helpers;
- tests covering project workflows.

## Safety boundary

Do not introduce runtime changes until the functional inventory names the files or modules to change.
