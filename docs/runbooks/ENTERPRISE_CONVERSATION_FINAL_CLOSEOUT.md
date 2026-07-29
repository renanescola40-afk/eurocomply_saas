# Runbook: Enterprise Conversation Final Closeout

## Preconditions

- all implementation PRs are merged;
- target deployment is healthy;
- Stripe runtime proof is fresh;
- enterprise runtime and production-final evidence are fresh;
- release Go/No-Go approval exists;
- the canonical scorecard artifact reports 100/100 PASS and zero critical open;
- the persistent execution state is fresh, exact-SHA and `ENTERPRISE_READY`;
- every proof references the same current `main` SHA.

## Procedure

1. Obtain the current 40-character `main` SHA.
2. Open **Enterprise Conversation Final Closeout** in GitHub Actions.
3. Enter the exact SHA.
4. Enter `CLOSE_ENTERPRISE_CONVERSATION`.
5. Approve the protected `production` environment.
6. Confirm the workflow retrieved both the Enterprise production-final and
   Enterprise readiness scorecard artifacts for that exact SHA.
7. Review the generated result and SHA-256 checksum.
8. Confirm `status=Complete`, `decision=CONVERSATION_COMPLETE` and
   `completionPercentage=100`.

## Failure handling

A failed run means the conversation remains open. Read `blockers` in the result
artifact. If retrieval failed, run the named protected workflow for the exact
current `main` SHA and retain its artifact. Regenerate only missing real
evidence and rerun. Never edit an evidence file merely to change its status.

## Rollback

The workflow is read-only. Disable it if its contract is suspected to be wrong, preserve prior artifacts, correct the assessor through review and rerun for the current SHA.
