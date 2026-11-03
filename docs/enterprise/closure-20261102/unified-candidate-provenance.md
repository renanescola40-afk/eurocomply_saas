# RISCK COMPLY — Unified Enterprise candidate, 2026-11-02

**Status: INTEGRATED_SOURCE_CANDIDATE / NOT ACCEPTED / NOT PRODUCTION GO.**

## Sources and exact provenance

Parent: GitHub #2595 at `a616067953e37a56693b5852eda6e1a59e9d6d5a` (includes GitHub workflow fan-out and CircleCI source-quality experiments from #2592).

Immutable source file snapshot integrated into this commit, disjoint against #2595 and against each other:
- GitHub #2593 `cc531179f27c282a3e3a4ec327de55345ac0c8e9`: canonical closure ledger.
- GitHub #2594 `58a60e1860a9c90fd03d6641d318148c976027ba`: Vercel rollback argv token protection and tests.
- GitHub #2596 `ee74245fb324e5de4c9ebd3f6ca51f1c23d6cf05`: audit metadata secret sanitization and tests.
- GitHub #2588 `227e845e508b9069380606c1039c430fff2c34b3`: Evidence Factory data and validator.

Total: 23 file snapshots plus this record. Source snapshots are **not** reviewed merges. Upstream PRs remain open. This branch must undergo tests, independent review and final conflict checks before promotion.

## Outstanding provider and cross-repo dependencies

- GitLab main at previous read `84a99f813bdce601c119bff27c1d82c5356295d6`; work-stream MR !2626 SHA `909d80b2c827f953c252565563bce694eafd909f` Draft; CI-coverage MR !2635 SHA `c9cc44ebfc6dee58e4912f839518e58b3d850294` open. GitLab !2633 was merged into its Work branch, **not** GitLab main. Those deltas were not transplanted here. Cross-repository parity remains UNVERIFIED.
- CircleCI #416 reports `ci/circleci: github-actions-recovery-quality` = failure on upstream #2595. GitHub's status provides no failing step; root cause `UNKNOWN_PENDING_CIRCLECI_JOB_LOG`. GitHub-hosted Actions separately suffer account runner-admission/budget blocking. Do not label #416 as code failure or infrastructure failure without logs.
- CircleCI source-quality does not satisfy all A-15/QAT-01 security/runtime requirements. No source PASS substitutes for authenticated test or deployment evidence.
- A-09/BIL-01 and A-18/OPS-01 historical source PASS 2026-10-22, all other original A gates not newly accepted; DAT-01 blocked.

## Safety

No CircleCI trigger/rerun, paid runner, production write, Stripe LIVE charge, outgoing email, production deployment, main merge, credential exposure or bypass is authorized by this integration. No formal gate PASS, 38/38, 24/24 or GO claim is made.

## 2026-11-03 additive integration

- CircleCI manual smoke and quality branch guards were corrected in the candidate: approved fix and unified branches now match manual workflow filters. Both trigger booleans stay false by default, and one-shot remains restricted to the old one-shot branch. Root cause of CircleCI #416 remains UNKNOWN without job log; the manual mismatch is proven independently.
- Latest reviewed GitHub PR #2596 head `8af9076ac77cfcda12fceca07a2353348c11e5ff`: the only changed blob compared with original #2596 snapshot was `src/server/queries/audit-events.test.ts` (fixture TypeScript typing). Incorporated without replacing other candidate files. This snapshot is still unreviewed on the new integration SHA.
- GitLab !2635 changes the GitLab-specific enterprise-source-proof job and assumes `gitlab.com/risck-comply-group/eurocomply_saas` as origin. It must NOT be transplanted verbatim into the GitHub-origin candidate due an intentional source-repository guard. Cross-repo parity remains blocked pending controlled mapping.

## Additional 2026-11-03 specialist handoff snapshots

Integrated **17 disjoint path snapshots**, pinned to original author branches:
- PR #2597 `963e7b157e84a39c247d3ba090dc3e1d6092bdd2`: billing canonical Stripe Price validation, initial Checkout/session reuse, subscription lifecycle and tests (7 paths). **Caution:** GitLab !2632 has a separate checkout lease/config fix touching the same Checkout route; that GitLab delta is **not** integrated. No Stripe TEST event/QA entitlement assertion was run as part of this integration.
- PR #2599 `f176ab4a035c7a16de2bfb83a98b7e9681d1ab52`: Clerk text-identity/MFA forward-only Enterprise membership migration and offline/synthetic QA test fixtures (5 paths). This is **source only** on this branch. **Do not apply migration in production or assume QA parity.** Upstream reported 22/22 rollback-only QA SQL checks; this integrator has not independently rerun them.
- PR #2600 `cf6caf80e856eb522d4d09c3286f61943aaed52d`: default fail-closed client env access scanner, npm security script and test contracts (5 paths). Upstream claims 19/19 local tests; these remain pending exact-integrated-SHA execution by independent CI.

No file overlaps with candidate PR #2598 edited paths or with one another were found in changed-file lists. These files are **unreviewed snapshots**, not full merge history or independent acceptance. Source integrations may expose cross-file conflicts and regression failures that only a complete exact-head build/test run can identify. Upstream PRs remain Draft/open and their approval boundaries are preserved. Enterprise source score and factory acceptance are unchanged: 2/24 historical A gates, 2/38 historical atomic controls, **0 new PASS**. CircleCI #416 remains unresolved without provider failure-step logs. No main merge, migrations, provider writes, new spending, Stripe LIVE transactions or emails were performed.
