# Platform Controls Rulesets Proof Runbook

## Trigger

Use this runbook when the exact-SHA platform controls workflow reports a classic branch-protection API failure, especially `github_api_403` or `github_api_404`.

## Preconditions

- the target is the current `main` SHA;
- the workflow runs from the canonical repository;
- the `Production` GitHub environment is approved;
- the token has read-only repository metadata access;
- the checkout uses `persist-credentials: false`;
- no write permission is granted to the workflow.

## Execution

1. Merge the fallback implementation through the normal protected process.
2. Confirm the merge commit is the current `main` SHA.
3. Run **Branch Protection Runtime Proof** for that exact SHA.
4. Allow the builder to attempt classic branch protection first.
5. When classic protection is unavailable, verify the artifact source is `github-api-repository-rulesets-fallback`.
6. Review the sanitized source details:
   - applicable ruleset count;
   - ruleset IDs and names;
   - source types;
   - required check inventory;
   - bypass actor count;
   - missing protection flags.
7. Confirm the generated evidence validator passes.
8. Retain the workflow artifact for the configured 90-day period.
9. Feed the successful exact-SHA artifact into the Enterprise scorecard and final closeout workflow.

## Required successful result

The artifact must contain:

- `status: Complete`;
- `outcome: passed`;
- exact SHA binding;
- current-main match;
- zero missing required checks;
- zero missing protection flags;
- zero bypass actors;
- no sensitive values or raw GitHub API payload;
- workflow run provenance.

## Stop conditions

Stop and keep `PLATFORM-CONTROLS` open when:

- `main` changed after checkout;
- no active ruleset targets `main`;
- an applicable ruleset contains a bypass actor;
- a required status check is missing or renamed without an approved alias;
- approval count is below one;
- CODEOWNERS review is not required;
- stale reviews are retained;
- review-thread resolution is not required;
- non-fast-forward updates are not blocked;
- deletion is not blocked;
- the artifact validator rejects provenance or redaction.

## Remediation

Repository configuration changes must be performed manually by an authorized repository administrator. The evidence workflow must never mutate rulesets automatically.

After a configuration correction:

1. record the owner and reason;
2. rerun the proof against the new exact `main` SHA;
3. retain both failed and successful evidence;
4. do not relabel the failed artifact as passing;
5. rerun the final Enterprise closeout.

## Incident handling

Treat unexpected bypass actors, deletion permission, force-push permission or loss of required checks as a release-security incident. Freeze Enterprise release promotion until the repository control is restored and exact-SHA evidence passes again.
