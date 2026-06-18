# P1-05 DAST automation

This document describes the automation added for P1-05 `dast-automated`.

## Scope

The workflow `.github/workflows/p1-dast-baseline.yml` runs an OWASP ZAP baseline scan against the production HTTPS target:

```text
https://eurocomply-saas.vercel.app
```

The target can be overridden only when manually dispatching the workflow.

## Generated evidence

A successful workflow run creates the artifact `p1-dast-baseline-report` with:

- HTML report;
- JSON report;
- Markdown report;
- XML report;
- SHA-256 digest file.

## Completion rule

This automation alone does not complete P1-05. The control can only be marked `Complete` after a successful production run is reviewed and formalized in:

```text
docs/security/evidence/p1/dast-automated.json
```

The final evidence record must include the reviewed workflow run, artifact metadata, report digest, reviewer, review timestamp, validation result, and next review date.

## Secrets

The workflow does not require production credentials, tokens, or repository secrets.
