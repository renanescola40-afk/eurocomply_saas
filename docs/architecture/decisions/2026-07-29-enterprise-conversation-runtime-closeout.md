# ADR — Enterprise Conversation Runtime Closeout Authority

## Decision

Conversation completion is determined by one protected orchestrator that validates four independent runtime and approval artifacts against the exact current `main` SHA.

## Rationale

Repository implementation, CI and deployment success are necessary but cannot prove external billing behavior, live enterprise controls, production readiness or human release approval. A single fail-closed assembler removes ambiguity and prevents stale evidence from being combined manually.

## Consequences

- Completion may remain Open after all code is merged.
- Any new commit invalidates previously assembled completion evidence.
- Operators must regenerate all required proof artifacts for the promoted SHA.
- The final artifact is authoritative only for the exact assessed release.
