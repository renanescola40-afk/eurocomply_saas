# Runbook: Enterprise Conversation Final Closeout

## Preconditions

- all implementation PRs are merged;
- target deployment is healthy;
- Stripe runtime proof is fresh;
- enterprise runtime and production-final evidence are fresh;
- release Go/No-Go approval exists;
- every proof references the same current `main` SHA.

## Procedure

1. Obtain the current 40-character `main` SHA.
2. Open **Enterprise Conversation Final Closeout** in GitHub Actions.
3. Enter the exact SHA.
4. Enter `CLOSE_ENTERPRISE_CONVERSATION`.
5. Approve the protected `production` environment.
6. Review the generated result and SHA-256 checksum.
7. Confirm `status=Complete`, `decision=CONVERSATION_COMPLETE` and `completionPercentage=100`.

## Failure handling

A failed run means the conversation remains open. Read `blockers` in the result artifact, regenerate only the missing exact-SHA evidence, and rerun. Never edit an evidence file merely to change its status.

## Rollback

The workflow is read-only. Disable it if its contract is suspected to be wrong, preserve prior artifacts, correct the assessor through review and rerun for the current SHA.
