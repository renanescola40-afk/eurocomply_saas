# Platform controls runtime proof

## Purpose

The final EU AI Act runtime closeout needs exact-SHA evidence that the repository policy protecting `main` requires status checks and approval, blocks force pushes and blocks deletion.

Code existence is not sufficient. The workflow must observe the active GitHub policy at runtime and retain a sanitized proof bound to the assessed SHA.

## Evidence sources

The proof checks two GitHub API surfaces in order:

1. classic branch protection: `/branches/main/protection`;
2. effective branch rules: `/rules/branches/main`.

The classic endpoint requires repository `Administration: read`. The workflow intentionally keeps only read-only Actions and Contents permissions, so GitHub may return `403` for the classic endpoint.

For a public repository, the effective-rules endpoint can be read with metadata access and returns active rules from repository or organization rulesets. A classic-endpoint `403` therefore does not automatically block proof when equivalent effective rules are observable.

## Required controls

The proof is `VERIFIED` only when all controls are observed:

- required status checks or required workflows;
- at least one approving pull-request review;
- non-fast-forward protection, which blocks force pushes;
- deletion restriction;
- successful API read.

Missing or malformed responses remain `BLOCKED`. The script never infers passing controls from documentation, prior runs or repository ownership.

## Retained artifact

The workflow writes:

```text
artifacts/eu-ai-act-final-runtime/platform-proof.json
```

The document contains:

- exact target SHA;
- canonical repository;
- selected evidence mode;
- sanitized HTTP statuses;
- observed rule types;
- PASS/FAIL checks;
- failed check names;
- limitations and truth boundary.

Tokens, actors, bypass identities and customer data are not retained.

## Validation

Run the focused contract suite:

```bash
npx vitest run \
  tests/security/platform-controls-runtime-proof.test.mjs \
  tests/security/eu-ai-act-final-runtime-closeout-workflow.test.mjs
```

Then run `EU AI Act Final Runtime Closeout` for the exact integrated `main` SHA. Strict closeout requires runtime evidence coverage of 100%.

## Rollback

If the ruleset fallback misclassifies repository policy:

1. revert the workflow call and proof script commits;
2. rerun report mode for the exact rollback SHA;
3. retain both artifacts;
4. keep `PLATFORM-CONTROLS` open;
5. restore the fallback only after the failing response shape is covered by tests.

Rollback must never relabel a blocked proof as verified.

## Truth boundary

This proof records repository policy observed at one timestamp and one SHA. It does not prove that administrators cannot change or bypass policy later, does not replace independent security review and does not establish customer-specific legal compliance.
