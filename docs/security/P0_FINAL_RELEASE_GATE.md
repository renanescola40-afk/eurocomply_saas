# P0 Final Release Gate

The final release gate is the last repository-side check before declaring P0 complete.

It validates:

- the runtime evidence register;
- runtime evidence file hygiene;
- item-specific runtime evidence validators;
- the remaining runtime evidence gap in strict mode.

## Workflow

`P0 Final Release Gate` runs on pull requests to `main` when runtime evidence or security validation files change. It can also be run manually with `workflow_dispatch`.

## Release-ready expectation

For a branch to pass this gate, the remaining runtime evidence gap must be closed:

- `production-secrets-provider-stores.json` exists and passes validation;
- `supabase-live-rls-validation.json` exists and passes validation;
- `external-security-review-or-pentest.json` exists and passes validation;
- `docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md` marks the remaining items as complete.

## Important

This workflow does not create evidence and does not approve exceptions. It only enforces that the evidence and register are ready before merge.
