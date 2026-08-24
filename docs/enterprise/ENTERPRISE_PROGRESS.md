# Enterprise progress

Current synchronized main baseline before this evidence PR:
`75151c463ea7bf54c74e4dc9e5cd3af995615eae`

Decision: **NO_GO / CURRENT-MAIN SCORE NOT RE-ACCEPTED**

## Evidence status

The last accepted score remains historical evidence only:

- historical completion: **45%** (**45 PASS**, **1 BLOCKED**, **54 NOT_VERIFIED**);
- assessed SHA: `c413288eb8453b55c4d049c758dc0cd063aa70b9`;
- scorecard run: `29703295579`;
- freshness: **STALE FOR CURRENT MAIN**;
- current Enterprise publication recommendation: **DO_NOT_PUBLISH_AS_ENTERPRISE**.

No PR, repository-only test, disposable database replay, green CI result or `READY`
deployment build raises that score. A new percentage or `ENTERPRISE_100: PASS` is
valid only after the canonical exact-current-serving-main authority accepts all
required protected runtime and human evidence.

## Current authority state

PR #1768 is **merged** and is no longer an active repository work package. The
pre-V19 application/schema compatibility issue #1778 is also **closed** by merged
#1780 without Production DDL.

The active P0 is now **#1814**: current Vercel Production deployment
`dpl_AR5ZwbDCHxT1kmps5xJVm5gmaBRx` reached `READY` and is bound to
`main@75151c463ea7bf54c74e4dc9e5cd3af995615eae`, but the project reports
`live=false` and the canonical `/api/health` returns HTTP
`402 DEPLOYMENT_DISABLED`. The connected Vercel team remains Pro and the build
completed successfully, so build readiness must not be promoted to serving
availability.

PR #1815 is the current evidence-only synchronization for this superseding state.
It does not change application runtime, billing, database schema, provider plan,
legal acceptance or external assurance.

Supabase Production promotion remains separately governed by #1631. No direct
Production SQL/DDL, migration repair, unrestricted `db push`, stale approval
carry-forward or Production write is authorized from this handoff.

## Mandatory direct authorities

The final authority must remain `NO_GO` until the same exact current serving SHA
has accepted evidence from:

1. Product FRIA Ephemeral Runtime QA;
2. Final Billing + Product Live Closeout;
3. Supabase Forward Production Acceptance;
4. Production Provider Runtime Proof;
5. External Security Assurance Acceptance.

Legal publication, recovery, deployment/smoke, runtime closeout and final Go/No-Go
controls remain independently required by the shared closure contract.

## Immediate P0

Restore the **existing** Vercel project serving state through the documented
zero-cost project-unpause/account-state path. Do not create a new account or
company, change plan, accept an invoice, purchase an upgrade or authorize spend.
If Vercel requires payment or a commercial change, stop for owner decision.

After canonical `/api/health` returns HTTP `200`, resolve the new exact serving
`main` SHA and re-run the protected Production runtime/provider evidence before
resuming any downstream final-authority sequence.

The official historical 45% score remains stale until a current exact-SHA
scorecard and its required evidence are accepted.
