# Exact-SHA Enterprise Go/No-Go evidence

## Objective

Prevent a static release-readiness command or a stale runtime artifact from being
interpreted as an Enterprise `Go`.

The Enterprise production runner writes a fail-closed candidate
`release-go-no-go.json` after collecting the prerequisite runtime evidence. After
the final validation evidence is written, the dispatcher regenerates the decision
with final validation included, validates it against the exact release commit,
build SHA and Enterprise target, and runs the final bundle verifier.

## Fail-closed contract

An Enterprise `Go` requires:

- schema `risck-comply.release-go-no-go.v1`;
- `status: Complete`, `outcome: passed` and `finalDecision: Go`;
- exact `commitSha` and `buildSha`;
- `releaseTarget: enterprise`;
- zero P0 blockers and zero deferred risks;
- every required evidence item present, parseable and successful;
- every commit-bound item matched to the exact release SHA;
- explicit confirmation that sensitive values, authorization headers and cookies
  were not retained.

Missing, stale, malformed, unredacted or target-mismatched evidence keeps the
release at `No-Go`.

## Commands

```bash
RELEASE_TARGET=enterprise \
RELEASE_COMMIT_SHA=<40-character-sha> \
RELEASE_BUILD_SHA=<40-character-sha> \
npm run release:go-no-go-evidence
```

The validator does not create evidence and cannot promote a control. The protected
Enterprise runner creates the artifact from actual prerequisite evidence and runs
this validator immediately afterwards. The dispatcher repeats the write and
validation after the final runner evidence exists, preventing a pre-final
candidate from becoming the retained release decision.

## Rollback

Reverting this change restores the former runner order. It does not mutate a
provider, database, deployment, secret or retained evidence artifact.
