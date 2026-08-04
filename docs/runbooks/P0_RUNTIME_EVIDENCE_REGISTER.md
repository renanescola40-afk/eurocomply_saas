# Runbook — Generated P0 runtime evidence register

## Purpose

Produce one trustworthy P0 status artifact for an exact repository SHA without relying on human-maintained Markdown statuses.

## Preconditions

- use a full 40-character SHA;
- assess the intended `main` commit or PR head explicitly;
- retain the canonical runtime evidence files under `docs/security/evidence/runtime/`;
- do not copy evidence from another SHA merely to improve the score;
- do not place secrets, cookies, authorization headers or provider credentials in evidence.

## Local report mode

```bash
RELEASE_COMMIT_SHA=<40-character-sha> \
node scripts/security/generate-p0-runtime-evidence-register.mjs \
  --sha=<40-character-sha>
```

Outputs:

- `artifacts/p0-runtime-evidence-register/p0-runtime-evidence-register.json`;
- `artifacts/p0-runtime-evidence-register/p0-runtime-evidence-register.md`.

Validate the result:

```bash
node scripts/security/validate-generated-p0-runtime-evidence-register.mjs \
  --sha=<40-character-sha>
```

Report mode exits successfully even when the decision is `NO_GO`; this allows diagnostics to be retained.

## Strict mode

Use strict mode only for a release-ready SHA:

```bash
node scripts/security/generate-p0-runtime-evidence-register.mjs \
  --sha=<40-character-sha> \
  --strict
```

Strict mode exits non-zero while any P0 control is open.

## GitHub Actions

Open **P0 Runtime Gap Report** or allow it to run on the pull request or `main` push. The workflow:

1. checks out the exact assessed SHA;
2. validates the fail-closed policy register;
3. runs focused contracts;
4. generates the runtime gap report;
5. generates JSON and Markdown registers;
6. independently validates semantic invariants;
7. writes SHA-256 checksums;
8. uploads a 365-day immutable artifact.

Artifact name:

```text
p0-runtime-evidence-register-<40-character-sha>
```

## Reading the result

Use the JSON as the source of truth.

Key fields:

- `decision`: `GO` or `NO_GO`;
- `completed`, `blocked`, `total`;
- `completionPercent`;
- `controls[].status`;
- `controls[].validatorFailures`;
- `controls[].legacyRegisterDrift`;
- `commitSha`;
- `sha256`.

`legacyRegisterDrift` is diagnostic only. It shows where the versioned policy status differs from the evidence-derived status. It cannot promote or block a control by itself.

## Resolving blockers

For each `Open` control:

1. read `evidenceFile` and `validatorFailures`;
2. execute the named specialist runtime workflow or repository check;
3. produce evidence for the exact target SHA;
4. verify redaction and passing outcome;
5. rerun the generated register;
6. never edit the generated artifact or policy row to force completion.

Common blocker classes:

- missing evidence file;
- invalid JSON;
- stale evidence;
- wrong repository, branch or SHA;
- placeholder-only content;
- provider configuration missing;
- specialist validator failure;
- external review not independently approved.

## Release decision

A generated `GO` is necessary but does not override additional Enterprise scorecards, protected environment approval, legal review or customer-specific procurement requirements.

A generated `NO_GO` is blocking for the P0 release policy.

## Failure handling

If generation crashes:

- confirm the SHA is 40 lowercase hexadecimal characters;
- run the policy checker;
- validate `package.json` and `package-lock.json` JSON;
- inspect the named canonical evidence file;
- run the focused tests;
- do not delete failing evidence to hide the failure.

If the digest validator fails, regenerate the artifact from the exact checkout. Do not manually recalculate or replace only the digest.

## Rollback

Revert the generator, validator, workflow, schema and policy semantics together. Preserve already uploaded artifacts for audit history.
