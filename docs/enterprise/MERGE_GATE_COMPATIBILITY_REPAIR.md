# Merge Gate Compatibility Repair

## Root cause

The repository requires exact legacy status contexts from `Full Security Suite`, `CI`, `RISCK COMPLY Security CI`, Gitleaks and Secret Scanning. Renaming a required workflow before branch protection and repository evidence are migrated causes circular failures: the drift validator blocks the pull request that introduces the new name.

## Compatibility decision

This repair preserves every currently required `Full Security Suite` workflow and job name. Branch protection therefore continues receiving the exact contexts it already expects.

## Pull-request behavior

- lint, typecheck, unit tests, build, application security and route-quality checks remain blocking;
- CodeQL, Semgrep, Gitleaks, Actionlint and OSSF Scorecard remain blocking;
- Dependency Review and npm audit run as blocking gates when dependency manifests change;
- unrelated pull requests do not fail because of pre-existing dependency findings that they did not introduce;
- branch-protection runtime evidence remains strict for `main` and manual release runs;
- pull requests validate required-check mapping without pretending that runtime administrator evidence is complete.

## Release behavior

Pushes to `main` and manually dispatched runs retain strict npm audit and branch-protection evidence validation. This keeps release promotion fail-closed while preventing unrelated feature or workflow pull requests from being permanently unmergeable.

## Follow-up migration

Required context renaming must be performed separately and atomically:

1. add the new context to GitHub branch protection;
2. update repository policy and evidence;
3. confirm the new context reports on a pull request;
4. remove the old context;
5. only then rename or remove compatibility workflows.
