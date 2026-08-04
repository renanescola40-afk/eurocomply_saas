# P0 Runtime Gap Report Usage

Use the P0 gap report and generated register to track release-blocking evidence for one exact repository SHA.

## Report command

```bash
RELEASE_COMMIT_SHA=<40-character-sha> \
node scripts/security/report-p0-runtime-evidence-gap.mjs
```

The report evaluates every active runtime control in `scripts/security/p0-runtime-evidence-catalog.mjs` through its canonical validator.

It records:

- exact repository, branch and SHA expectations;
- satisfied and missing controls;
- validator failures;
- placeholder and parse state;
- drift between the legacy policy row and derived evidence status.

## Generate the canonical register artifact

```bash
node scripts/security/generate-p0-runtime-evidence-register.mjs \
  --sha=<40-character-sha>
```

Outputs:

- `artifacts/p0-runtime-evidence-register/p0-runtime-evidence-register.json`;
- `artifacts/p0-runtime-evidence-register/p0-runtime-evidence-register.md`.

Validate the semantic result:

```bash
node scripts/security/validate-generated-p0-runtime-evidence-register.mjs \
  --sha=<40-character-sha>
```

## Strict mode

```bash
node scripts/security/report-p0-runtime-evidence-gap.mjs --strict
node scripts/security/generate-p0-runtime-evidence-register.mjs \
  --sha=<40-character-sha> \
  --strict
```

Strict mode exits non-zero while any required control remains incomplete. Use it only on final-evidence or release-ready branches and protected release workflows.

## Source-of-truth rule

`docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md` is policy metadata only. Its versioned rows intentionally remain `Open` and cannot prove or promote a runtime control.

A runtime control is satisfied only when:

- the canonical evidence file exists and parses;
- status is `Complete`;
- outcome passes when required;
- content is not placeholder-only;
- the specialist validator returns zero failures;
- repository, branch, SHA, freshness and provenance requirements pass.

Repository controls are recalculated from `package.json` and `package-lock.json` on the exact checkout.

## Decision interpretation

- `GO`: every active P0 control is derived as `Complete`.
- `NO_GO`: one or more controls are missing, invalid, stale, wrong-SHA, placeholder-only or fail a specialist validator.

The generated P0 decision does not replace the complete Enterprise scorecard, protected environment approval, independent security review, legal review or customer-specific procurement requirements.
