# RISCK COMPLY — CircleCI Enterprise evidence bridge (2026-10-27)

## Execution boundary

This branch enables manually triggered, fail-closed **source-only Enterprise testing** and a separate **disposable PostgreSQL 17 synthetic replay**. It does **not** close or approve Category A gates automatically, and it does not touch Supabase QA/PROD, Stripe, Vercel, or email.

Configured run parameters (both default **false**):
- `run_enterprise_source=true`: Node 22, full test/unit/lint/typecheck, source security, Stripe *offline contracts*, migration *offline contracts*, G1 scorer and exact-SHA artifact.
- `run_enterprise_pg_synthetic=true`: requires an additional CircleCI approval job; replays on disposable postgres:17.6 using scripts/diagnostics/g5-02-canonical-replay.py and preserves failure artifacts.

Strict branch: `ci/circleci-enterprise-gates-20261027`. Exact source SHA checked inside each job.

## Owner preflight before running

1. Confirm existing CircleCI project checkout/config source and whether it reads the GitHub branch or GitLab branch. Existing Vercel is GitHub-linked; the GitHub branch may not equal the GitLab integration branch.
2. Confirm **remaining included CircleCI credits** and any unintended triggers before opting in; **do not trigger or buy credits** unless the included balance is sufficient.
3. Select the matching CircleCI project, branch and `Trigger Pipeline`; add **only one** named boolean parameter at a time. For replay, manually approve the isolated Postgres job.
4. Read CircleCI run ID, exact SHA, test exit statuses and redacted artifacts. Never infer QA runtime PASS from source-only CI or the Postgres synthetic replay.
5. Compare exact SHA of test/artifacts against the GitLab release candidate and Vercel QA deployment; differences invalidate gate credit.

## Closure gates

- QAT-01: source suite is only one subset; requires every mandatory regression/security check PASS for the **exact approved release SHA**.
- DAT-01: synthetic PostgreSQL replay can expose migration errors but does **not** satisfy full reconciled 137/137 isolated QA replay and durable schema parity.
- QAT-02/03, BIL-02/03/04/05: require QA isolation, authenticated E2E and real Stripe TEST provider delivery; not attempted in these jobs.
- OPS: require provider and governance readbacks; TRU legal controls require qualified review. CI cannot self-approve.
- Existing approved A-09 and A-18 remain the only registered PASS until formally verified new evidence is reviewed.

No prod writes, no email, no Stripe live charges, no changes to gate registry, and no automatic merges/releases. The CircleCI integration and credits are external to the GitLab/GitHub connectors used to stage this configuration.
