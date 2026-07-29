# Enterprise Conversation Runtime Closeout

This control is the only supported path from repository-complete to conversation-complete.

## Required proofs

All artifacts must be `Complete`, carry a passing/Go outcome, and reference the exact current `main` SHA:

- Stripe runtime proof;
- enterprise runtime proof;
- production-final proof;
- release Go/No-Go proof.

## Execution

Run **Enterprise Conversation Runtime Closeout** with the four source workflow run IDs, the exact current `main` SHA, and confirmation `CLOSE_ENTERPRISE_CONVERSATION`.

## Completion result

The conversation is complete only when the retained artifact contains:

- `status: Complete`;
- `decision: CONVERSATION_COMPLETE`;
- `completionPercentage: 100`;
- `blockers: []`.

Merge, Vercel success, CI success, or documentation alone are not runtime completion evidence.
