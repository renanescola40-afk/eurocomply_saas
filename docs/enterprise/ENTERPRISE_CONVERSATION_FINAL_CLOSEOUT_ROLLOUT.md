# Enterprise Conversation Final Closeout Rollout

## Before merge

- [ ] Contract tests pass on the exact PR head SHA.
- [ ] Workflow permissions remain `contents: read`.
- [ ] Production environment protection is enabled.
- [ ] No evidence file is marked complete by this PR.
- [ ] No secret or full external identifier is committed.

## After merge

- [ ] Re-run Stripe runtime proof for the current `main` SHA.
- [ ] Re-run enterprise runtime validation.
- [ ] Re-run enterprise production-final validation.
- [ ] Record release Go/No-Go approval.
- [ ] Execute the protected final closeout workflow.
- [ ] Review the artifact checksum and blockers array.

## Completion

Closure is authorized only when the workflow emits:

- `status: Complete`;
- `decision: CONVERSATION_COMPLETE`;
- `completionPercentage: 100`;
- no blockers;
- exact current-main SHA across every evidence source.
