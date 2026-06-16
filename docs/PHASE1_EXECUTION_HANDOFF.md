# Phase 1 Execution Handoff

This handoff is for the person or CI job that will perform the real Phase 1 execution.

## Start here

Run the commands below from the repository root:

```bash
npm run supply-chain:lockfile
npm ci
npm run phase1:capture
npm run phase1:smoke
npm run phase1:evidence
npm run phase1:check
npm run phase1:closeout
```

## Files that must be generated or updated

Commit these files only after they are generated from real command output:

```text
package-lock.json
docs/evidence/phase1/floating-deps.log
docs/evidence/phase1/npm-ci.log
docs/evidence/phase1/npm-audit.log
docs/evidence/phase1/typecheck.log
docs/evidence/phase1/test.log
docs/evidence/phase1/build.log
docs/evidence/phase1/lint.log
docs/evidence/phase1/dev-smoke.log
```

## Do not commit

- `.env` files.
- Provider secrets.
- Service-role keys.
- Private keys.
- Customer data.
- Hand-written or fabricated command output.

## Required review before completion

Before Phase 1 is marked complete, review:

- `docs/PHASE1_CLOSEOUT_CHECKLIST.md`
- `docs/PHASE1_DEPENDENCY_REMEDIATION.md`
- `docs/PHASE1_WARNING_TRIAGE.md`
- `docs/evidence/phase1/WARNING_EXCEPTIONS_TEMPLATE.md` if warnings remain.

## Completion statement

Phase 1 is complete only after the generated lockfile and logs are committed and `npm run phase1:closeout` passes against that committed evidence.
