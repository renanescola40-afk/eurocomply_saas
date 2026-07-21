# ADR: automatic safe exact-SHA runtime bootstrap

## Status

Accepted.

## Context

The canonical enterprise scorecard remained at 46% after the protected campaign and promotion contracts were merged because the full closeout was intentionally manual and included a controlled production rollback plus external assurance. Eleven non-destructive lanes could be executed independently, but several were dispatch-only and push-triggered lanes were not collected into one promotion report.

## Decision

Introduce two explicit campaign profiles:

- `full`: all registered lanes, mandatory controlled rollback confirmation, external assurance and final REL-10 coherence;
- `safe`: every lane except `RECOVERY` and `ASSURANCE`, with no rollback confirmation and no final coherence generation.

After a successful `Full Security Suite` run on current `main`, the safe bootstrap reuses successful or running exact-SHA child runs, dispatches only missing or previously failed safe lanes, downloads bounded artifacts from trusted hosts, normalizes evidence and creates a partial promotion report.

## Security properties

- only current `main` may be assessed;
- no recovery or external-assurance workflow can enter the safe profile;
- existing runs are reused only when repository branch and exact SHA match;
- failed completed runs are not trusted and are re-dispatched;
- artifact count, size, host, archive paths, symlinks and expansion are bounded;
- safe promotion cannot generate REL-10 or claim `GO` merely because safe controls passed;
- every report preserves baseline, delta, remaining controls and exact-SHA provenance.

## Consequences

Routine merges can automatically produce evidence-backed progress without authorizing destructive recovery actions. Full release remains blocked until recovery, independent assurance and final coherence are separately accepted.
