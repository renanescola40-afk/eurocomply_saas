# Fail closed on audit-chain verification read errors

Date: 2026-07-17
Status: Proposed

## Context

The audit-chain verification endpoint used a general audit-event reader that returned an empty array when database configuration or reads failed. The verifier accepts an empty input as a valid empty chain, so unavailable evidence could be shown as a successful verification with zero checked events.

## Decision

Use a verification-specific reader that requires the server database client, preserves the existing legacy-column compatibility path, returns an empty array only after a successful zero-row query, logs only sanitized error codes, and throws `audit_chain_events_unavailable` when canonical or legacy reads fail.

No runtime verification result is claimed by this decision record.

## Consequences

The endpoint now fails rather than reporting unavailable audit evidence as valid. This intentionally prioritizes evidence integrity over availability for the verification operation.

The general audit-event reader is unchanged so this pull request remains small and reviewable.

## Risks

Database or schema failures that previously produced an empty successful result now surface as errors. Legitimate successful zero-row queries remain supported.

## Rollback

Revert the strict reader and restore the route's previous reader. That restores the earlier availability behavior and its false-success risk.
