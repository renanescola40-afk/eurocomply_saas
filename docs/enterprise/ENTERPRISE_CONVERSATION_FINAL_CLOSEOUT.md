# Enterprise Conversation Final Closeout

## Purpose

This control defines the only trustworthy condition under which the Enterprise implementation conversation can be declared complete and closed.

## Completion decision

The assessor emits one of two decisions:

- `CONVERSATION_REMAINS_OPEN`: one or more exact-SHA runtime or release proofs are absent, stale or failed;
- `CONVERSATION_COMPLETE`: all mandatory proofs pass for the exact current `main` SHA.

## Mandatory evidence

1. Stripe billing or entitlement runtime proof;
2. enterprise runtime validation;
3. enterprise production-final validation;
4. release Go/No-Go approval.
5. canonical 100-control Enterprise scorecard at 100% with zero critical controls open;
6. persistent execution state marked `FRESH_EXACT_SHA`, `GO` and
   `ENTERPRISE_READY`.

Every item must:

- exist as parseable JSON;
- report a passing or complete outcome;
- carry a full 40-character commit SHA;
- match the exact release SHA being assessed.

The protected workflow retrieves two retained artifacts before assessment:

- `enterprise-production-final-evidence-<SHA>`;
- `enterprise-readiness-scorecard-<SHA>`.

It rejects failed runs, non-`main` runs, stale SHAs, expired artifacts, missing
canonical files, duplicate archive entries and invalid JSON.

## Truth boundary

Repository controls, tests and workflows can be complete while external runtime evidence remains open. The closeout workflow never converts missing external proof into a passing result.
It also never publishes a synthetic intermediate percentage. While the current
score is unavailable, the last accepted 45% remains historical and stale.

## Closure message

Only a successful protected workflow run may support the statement:

> This conversation has completed its full mission. Close this conversation and continue only with conversations responsible for other domains.
