# Release Full Readiness Runner

This document defines the standalone full release readiness runner for EuroComply.

## Purpose

`check-release-full-readiness.mjs` provides one direct command for the final pre-release governance pass without changing the normal build or `security:ci` behavior.

It runs:

1. `npm run release:readiness`
2. `npm run security:final-readiness`

## Command

```bash
node scripts/security/check-release-full-readiness.mjs
```

## When to run

Run this before promoting a release to:

- private beta
- public production
- enterprise pilot
- enterprise procurement review

## Expected result

The command must finish with:

```txt
Release full readiness: ok
```

Any failed child command must block promotion unless a named release owner and final approver accept the exception in `docs/RELEASE_APPROVAL_RECORD.md`.

## Relationship to other checks

This runner does not replace:

- `npm run security:ci`
- `npm run build`
- `npm run typecheck`
- `npm run test`
- `npm run test:e2e`

It is a governance wrapper for release operations and final readiness.

## Enterprise release rule

A rigorous enterprise release must not rely on this runner alone. It also requires:

- CI evidence
- build evidence
- lockfile and npm audit evidence
- live Supabase/RLS validation
- audit-chain migration evidence
- billing/webhook validation
- malware/content scanning provider evidence
- support readiness evidence
- rollback and incident response ownership
- Go/No-Go approval
