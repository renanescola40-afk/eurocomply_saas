# GitHub Phase 1 — Essential Baseline

## Objective

Use GitHub as the minimum viable control plane for source control, pull requests, CI/CD, dependency security and release evidence without adding another paid platform.

## Current repository assessment

The repository already contains CI, CodeQL, dependency review, secret scanning, CODEOWNERS and Dependabot configuration. The primary risk is no longer missing automation. It is governance drift caused by many overlapping workflows and an oversized required-check set.

The branch-protection evidence currently stored in the repository is an exception rather than durable administrator evidence. Its recorded expiry was 2026-07-20. Production promotion must remain blocked until the GitHub ruleset or branch-protection configuration is verified and captured again.

## Essential controls

### Repository and pull requests

- Default branch: `main`.
- All production changes enter through pull requests.
- Direct pushes, force pushes and branch deletion are blocked.
- Conversations must be resolved before merge.
- Stale approvals are dismissed after new commits.
- CODEOWNERS review is required for sensitive paths.
- Squash merge is the default merge method for feature and remediation PRs.

### Required checks

Keep the required set small, stable and deterministic. Required checks must run on every pull request targeting `main`, must never depend on optional production credentials and must have bounded timeouts.

Recommended essential set:

1. `CI / quality`
2. `CodeQL / Analyze JavaScript and TypeScript`
3. `Dependency Review / Dependency review`
4. one canonical secret-scanning check
5. one canonical release/security aggregate gate only when it is deterministic and always created

Checks that exist only for scheduled, manual, environment-specific or evidence-capture workflows must not be configured as branch-required checks.

## Dependabot

The existing configuration is intentionally conservative:

- weekly npm updates;
- weekly GitHub Actions updates;
- grouped framework, Sentry, Supabase and test updates;
- major framework upgrades ignored;
- low open-PR limits to prevent dependency queue flooding.

Do not increase the pull-request limits until the current merge queue is consistently healthy.

## CodeQL and dependency security

CodeQL runs for JavaScript and TypeScript on pull requests, pushes to `main` and a weekly schedule. Dependency Review should run only when dependency manifests change or as a lightweight PR gate.

Repository secret scanning and push protection must be enabled in GitHub settings when available for the repository plan. Workflow-based Gitleaks is a compensating control, not a replacement for native push protection.

## Environments

Create these GitHub environments:

### preview

- no manual approval;
- preview-only credentials;
- no production billing or database secrets.

### production

- required reviewer: repository owner or designated release manager;
- deployment branch restricted to `main`;
- production secrets stored only at environment level;
- deployment approval required;
- rollback target and last-known-good deployment reference maintained.

## Branch protection administrator checklist

In **Settings → Rules → Rulesets** or **Settings → Branches**, configure `main`:

- require a pull request before merging;
- require at least one approval;
- require CODEOWNERS review;
- dismiss stale approvals;
- require conversation resolution;
- require branches to be up to date;
- require the essential checks listed above;
- block force pushes;
- block deletion;
- restrict direct pushes;
- do not require checks that are not emitted on every pull request.

After configuration, capture a redacted screenshot or API export and replace the expired exception evidence in `docs/security/evidence/runtime/branch-protection-required-checks.json`.

## Adoption decision

No new paid GitHub-adjacent platform is required in Phase 1. The repository should first simplify and stabilize the controls already present. New tools are justified only after a measured gap remains in developer velocity, security detection, observability, identity, billing or compliance operations.

## Exit criteria

Phase 1 is complete when:

- every PR receives the same bounded essential checks;
- no required check remains indefinitely pending;
- branch protection has durable administrator evidence;
- Dependabot creates a controlled number of grouped PRs;
- CodeQL, dependency review and secret scanning produce actionable findings;
- production deployment requires environment approval;
- the open PR queue can be merged without workflow-name drift or duplicate gates.
