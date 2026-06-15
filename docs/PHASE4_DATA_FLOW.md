# Phase 4 Data Flow

This document defines the initial data-flow planning requirements for Phase 4.

## Scope

This is a planning artifact. It does not authorize product, email, document, or UI template changes.

## Entry commands

```bash
npm run phase3:strict
npm run phase3:closeout
npm run phase4:check
```

## Data-flow areas to document before implementation

- User identity and session context.
- Organization and membership context.
- Compliance project data.
- Generated document metadata.
- Billing and subscription state.
- Audit and operational events.

## Required controls

- Identify the source of truth for each data area.
- Identify read and write paths before runtime changes.
- Identify cross-tenant boundaries before runtime changes.
- Identify audit events before runtime changes.
- Avoid storing secrets or provider credentials in repository files.

## Implementation rule

No Phase 4 runtime implementation should proceed until data-flow assumptions are documented and checked.
