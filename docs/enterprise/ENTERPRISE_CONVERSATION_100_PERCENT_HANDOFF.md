# Enterprise Conversation 100% Handoff

Repository implementation is complete when this PR is merged. Operational completion still requires the four exact-SHA proof runs.

## Required operator inputs

- Stripe runtime workflow run ID;
- enterprise runtime workflow run ID;
- production-final workflow run ID;
- release Go/No-Go workflow run ID;
- exact current `main` SHA;
- confirmation phrase `CLOSE_ENTERPRISE_CONVERSATION`.

## Authoritative closeout signal

Only the artifact produced by **Enterprise Conversation Runtime Closeout** may authorize the statement that this conversation is 100% complete. The artifact must contain `CONVERSATION_COMPLETE`, 100%, and an empty blockers array.
