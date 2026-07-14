# Decision: require isolated restore evidence before DR completion

## Status

Accepted for repository implementation. Runtime execution remains pending.

## Context

The Enterprise scorecard assigns six critical Recovery controls to backup/restore evidence, but the repository previously contained only a draft test plan. There was no executable contract preventing a production target, a same-project restore, missing integrity/RLS checks, or unmeasured RPO/RTO from being presented as completed evidence.

## Decision

Use an operator-produced, versioned restore manifest and a fail-closed repository validator. The validator may emit `Complete` evidence only when:

- the source is production and the target is explicitly `recovery-isolated`;
- source and target project references differ;
- a completed encrypted backup has a SHA-256 checksum;
- restore timestamps are ordered and the restore completed;
- backup existence, restore execution, data integrity and post-restore RLS checks all pass with evidence references;
- RPO and RTO are measured numerically;
- a named reviewer approves after restore completion;
- the tested commit is a full Git SHA.

The committed P1 evidence remains `Open` until such a real manifest is supplied.

## Safety boundary

The validator does not connect to Supabase, create backups or execute restores. This avoids placing destructive production credentials in generic CI and prevents a repository workflow from selecting a production target. Execution remains an owner-controlled change window in an isolated recovery project.

## Consequences

A valid manifest can be transformed into machine-readable evidence and consumed by the Enterprise scorecard. Static tests alone cannot increase the Recovery score. Operators must retain provider/job references outside the repository where they may contain sensitive infrastructure data; committed evidence should contain only reviewed references and measurements.

## Risks

- The contract validates supplied evidence structure and coherence, not the provider's truthfulness.
- Manual execution can still be performed incorrectly before validation.
- RPO/RTO targets are not defined by this change; only observed measurements are required.
- Project references must be reviewed to avoid exposing sensitive identifiers.

## Rollback

Revert the validator, tests, example manifest, Open evidence record and documentation. Do not mark backup/restore evidence complete as part of rollback. The scorecard must continue to treat the control as `NOT_VERIFIED` until an alternative reviewed mechanism exists.
