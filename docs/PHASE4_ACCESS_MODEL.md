# Phase 4 Access Model

This document defines the initial access-model planning requirements for Phase 4.

## Scope

This is a planning artifact. It does not authorize product, email, document, or UI template changes.

## Entry commands

```bash
npm run phase3:strict
npm run phase3:closeout
npm run phase4:check
```

## Access areas to document before implementation

- User account access.
- Organization membership access.
- Organization role boundaries.
- Compliance project access.
- Generated document access.
- Billing administration access.
- Audit log visibility.

## Required controls

- Identify the actor for each protected action.
- Identify the organization boundary for each protected action.
- Identify the minimum role for each protected action.
- Identify read-only and write access before runtime changes.
- Identify audit events for privileged actions before runtime changes.
- Avoid storing secrets or provider credentials in repository files.

## Implementation rule

No Phase 4 runtime implementation should proceed until access assumptions are documented and checked.
