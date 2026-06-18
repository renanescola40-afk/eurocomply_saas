# P1 DAST main trigger

This note documents the follow-up change to `.github/workflows/p1-dast-baseline.yml`.

The workflow now also runs on `push` to `main` when the DAST workflow or its automation documentation changes. This allows merged DAST automation changes to produce an immediate workflow run and artifact that can later be reviewed as real P1-05 evidence.

This change does not mark P1-05 `dast-automated` as `Complete`. P1-05 still requires a successful production run, a retained `p1-dast-baseline-report` artifact, report review, and a final evidence JSON record.
