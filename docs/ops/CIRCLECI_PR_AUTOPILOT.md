# RISCK COMPLY — GitHub + CircleCI PR Autopilot

Status: proposed; not formally validated or enabled on `main` until reviewed and merged.

## Purpose

Keep GitHub as canonical source and PR review system, and use CircleCI to execute bounded, automatic source-only checks for pushes and pull-request events. No GitHub Actions runners are required for these checks.

### Automatic workflow

`pr-source-autopilot` in `.circleci/config.yml` runs only when `pipeline.event.name` is `push` or `pull_request`. It runs lockfile verification, the offline security policy, ESLint, TypeScript, source unit tests and a local CI safety contract. It stores an exact-commit SHA report with `formal_acceptance: NOT_GRANTED`. It does **not** perform Next.js release builds, QA provider calls, Stripe TEST deliveries, database replay, deploys, reviews or gate acceptance.

The job has no privileged CircleCI context and fails closed if a privileged provider variable is injected. Project-wide variables are still inherited: ensure no privileged provider credentials are configured as *project-level* environment variables available to untrusted PR jobs; restrict them to scoped CircleCI contexts and approved manual workflows.

All preexisting manual QA, runtime and production-sensitive jobs remain protected by their prior parameters, filters and approval jobs. Never turn those defaults on for ordinary PR CI.

### One-time project-side activation after qualified review

1. Open [CircleCI](https://app.circleci.com), select `renanescola40-afk/eurocomply_saas`, then **Project Settings → Project Setup**.
2. Check the existing integration type, pipeline config source `.circleci/config.yml`, and whether a GitHub event trigger already exists. Do **not** add a second duplicate pipeline/trigger for the same event.
3. For **GitHub OAuth**, keep its existing automatic push trigger; in **Advanced Settings**, enable **Only build pull requests** to limit credit usage on ordinary branch pushes, if compatible with needed development branches. For **GitHub App**, configure a single event trigger for **PR opened or pushed to, default branch and tag pushes**; do not select `All pushes` if that would trigger unbounded unrelated branches.
4. In **Advanced Settings**, confirm **GitHub status updates** are enabled, disable passing secrets to fork PRs, and enable **Auto-cancel redundant workflows** only if its scope will not cancel important in-flight manual QA jobs. Verify included credit balance and any billing ceiling before automation.
5. Merge this PR into `main` only after qualified independent review and genuine config validation. Do not alter existing required GitHub checks until an actual CircleCI run on the final SHA is PASS. Once PASS exists, add its exact status context to the protected-branch ruleset; retain any security checks without verified equivalents.

### Verification

- A new PR or pushed commit produces one CircleCI pipeline automatically.
- `pr-source-autopilot` executes without manual pipeline parameters.
- CircleCI posts a terminal status to the *same exact SHA* on the GitHub PR.
- A source test failure remains FAIL and cannot be treated as a gate PASS.
- A duplicate/stale status is not accepted as evidence for a different SHA.

### ChatGPT integration

ChatGPT does not have a direct CircleCI control connector in this conversation. It can read the external CI commit statuses posted to GitHub via the connected GitHub app. An independent ChatGPT scheduled agent can inspect changed PR statuses and recommend/implement narrowly authorized corrections in branches. It must not fake statuses, invent CircleCI provider logs, merge into `main` without governance, alter production or declare Enterprise acceptance from source-only tests. CircleCI itself provides the immediate event-driven CI execution; ChatGPT monitoring is periodic.

### Cost and security boundaries

No additional paid service, no mail, no production credentials, no production changes, no bypass of approval gates, and no unbounded retry loop. Monthly included CircleCI credits are finite: automatic CI can exhaust them. If balance or plan status is unknown, do not approve paid capacity. Do not introduce automatic workflow reruns until credit usage and failure pattern are measured.
