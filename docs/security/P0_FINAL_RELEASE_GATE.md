# P0 Final Release Gate

The final release gate is the last repository-side check before declaring P0 complete.

It validates:

- the runtime evidence register;
- runtime evidence file hygiene;
- item-specific runtime evidence validators;
- the remaining runtime evidence gap in strict mode when runtime evidence or the runtime evidence register changes.

## Workflow

`P0 Final Release Gate` runs on pull requests to `main` when runtime evidence, security validation files, or the workflow itself changes. It can also be run manually with `workflow_dispatch`.

The strict runtime evidence gap check runs when:

- the workflow is run manually; or
- the pull request changes `docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md`; or
- the pull request changes files under `docs/security/evidence/runtime/`.

For gate-only or checker-only changes, the workflow still validates register and file hygiene, but does not require the remaining runtime evidence gap to be closed before the gate itself can be merged.

## Release-ready expectation

For a final evidence branch to pass strict mode, the remaining runtime evidence gap must be closed:

- `production-secrets-provider-stores.json` exists and passes validation;
- `supabase-live-rls-validation.json` exists and passes validation;
- `external-security-review-or-pentest.json` exists and passes validation;
- `docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md` marks the remaining items as complete.

## Important

This workflow does not create evidence and does not approve exceptions. It only enforces that the evidence and register are ready before merge.
