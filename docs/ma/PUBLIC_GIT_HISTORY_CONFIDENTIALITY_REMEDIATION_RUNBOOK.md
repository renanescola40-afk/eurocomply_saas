# RISCK COMPLY — Public Git History Confidentiality Remediation Runbook

Date: 2026-10-07
Scope: historical exposure of private buyer correspondence in previously merged public Git history.

## Objective

Remove or materially restrict public reachability of the affected historical content without silently rewriting protected history or breaking production/integrations.

This runbook is preparation only. No history rewrite, force push, repository visibility change or GitHub Support purge has been executed by this document.

## Current verified state

- current default-branch tree does not contain the previously exposed buyer-contact names;
- private correspondence was removed from the current tree;
- prior merged commits remain reachable in public Git history;
- repository visibility is public;
- confidentiality therefore remains OPEN.

## Required safeguards before any destructive remediation

1. Freeze merges and direct pushes temporarily.
2. Record the exact current default-branch head.
3. Export a full mirror backup of all refs to an access-controlled location.
4. Inventory protected branches, rulesets, tags, release refs and open PRs.
5. Export/capture the exact branch-protection and ruleset configuration before any temporary exception.
6. Inventory deployment/integration dependencies that consume commit SHAs.
7. Identify every affected commit and path without copying the sensitive text into a new public artifact.
8. Inventory repository forks and determine whether any affected commit is reachable from a fork.
9. Inventory collaborators/automation identities that may hold clones or local branches containing pre-rewrite history.
10. Decide whether the repository will remain public or be made private.
11. Obtain explicit owner authorization for history rewrite / force-with-lease and, separately, any visibility change.
12. Prepare rollback refs outside the public repository.
13. Define a time-bounded maintenance window and an operator responsible for restoring protections.
14. Notify required collaborators/operators through approved channels that old clones must not push after remediation.

## Option A — Private-first containment

Use when immediate confidentiality reduction is more important than preserving public accessibility.

Before changing visibility:
- inventory public forks first;
- do not assume making the upstream private makes existing public forks private;
- record any fork that still exposes affected history as an OPEN confidentiality dependency.

Sequence:
1. change repository visibility to private only after explicit approval;
2. verify GitHub Actions, Vercel and other integrations still operate;
3. coordinate cleanup/deletion with owners of affected public forks;
4. perform history rewrite if permanent purge is required;
5. rotate credentials only if credentials were exposed; none are currently claimed exposed by this incident;
6. validate that historical sensitive strings no longer resolve through ordinary repository access;
7. keep confidentiality OPEN while any affected public fork remains reachable.

## Option B — Public repository history rewrite

Use only with explicit destructive-change approval.

### Branch-protection / ruleset exception procedure

The repository baseline protects `main` from force pushes. Do not disable this control casually.

Before any force update:
1. capture the exact current branch-protection and ruleset configuration;
2. record the exact old object ID (OID/SHA) for every affected ref and the approved rewrite target for each ref;
3. restrict the maintenance window to the designated operator;
4. freeze merges/direct pushes and prevent unrelated writes;
5. create the rewritten mirror and verify it offline;
6. if GitHub protection blocks the required force-with-lease update, create a narrowly scoped, time-bounded exception only for the required ref/operator;
7. force-update only the explicitly approved affected refs using an explicit expected-value lease bound to the captured old OID for each ref (for example, the equivalent of `--force-with-lease=<ref>:<expected-old-oid>`); never use an unqualified/bare lease for this remediation;
8. immediately restore the exact captured protection/ruleset configuration;
9. verify force-push protection, required reviews, status checks and other branch rules are restored;
10. run CI/security/release checks again before unfreezing development.

If a safe exception cannot be created and restored predictably, do not weaken protection; use the private-first containment path or another GitHub-supported remediation path.

### Rewrite sequence

1. create a mirror clone;
2. rewrite every affected ref so the sensitive historical content is removed;
3. preserve unrelated repository content and authorship where practicable;
4. force-update only approved affected refs with explicit per-ref expected-value leases bound to the captured old OIDs under the procedure above;
5. re-create or reconcile tags only after verification;
6. inspect PR refs and other server-side references;
7. coordinate with owners of every affected public fork for cleanup/deletion;
8. request GitHub Support assistance where inaccessible hosted refs/caches remain;
9. validate branch protections and CI after rewrite.

## Collaborator clone cleanup — mandatory before reopening development

A successful server-side rewrite is not sufficient if collaborators retain old clones.

Before the merge/push freeze is lifted:
1. identify collaborators/automation operators with local clones;
2. instruct them not to merge or push any pre-rewrite branch/history;
3. require a fresh clone from the rewritten canonical repository, or an explicitly validated local cleanup;
4. require old local refs/reflogs/branches containing affected history to be removed or quarantined;
5. require feature branches to be rebased onto the rewritten history rather than merged from pre-rewrite ancestry;
6. obtain acknowledgment from relevant collaborators/operators;
7. verify automation/bots are using the rewritten refs.

Any pre-rewrite clone that can reintroduce affected commits keeps confidentiality remediation operationally OPEN.

## Fork handling — mandatory

Before choosing either remediation option:
- enumerate public and private forks visible to the repository owner;
- determine whether affected commits are reachable from each relevant fork;
- coordinate with each affected fork owner to clean or delete exposed history;
- do not assume GitHub Support can purge content from independently controlled forks;
- do not mark confidentiality CLOSED while any publicly reachable affected fork remains.

## Important GitHub limitations

Rewriting the default branch alone may not purge all hosted copies. Pull-request refs, forks, caches, detached server-side references or collaborator clones may preserve historical objects.

Making an upstream repository private also does not, by itself, guarantee removal of already-public fork history.

A complete purge may require:
- affected-ref rewrite;
- protected-branch exception and restoration;
- collaborator re-clone/cleanup;
- fork-owner coordination;
- GitHub Support intervention for hosted references/caches that repository owners cannot remove directly.

## Verification gates

Do not mark confidentiality CLOSED until all applicable checks pass:

- default branch no longer exposes the historical content;
- affected branches/tags no longer expose it;
- pull-request refs are evaluated;
- affected forks are cleaned/deleted or otherwise no longer publicly expose the content;
- public code search does not surface it;
- direct historical commit URLs are no longer publicly usable where purge is expected;
- GitHub Support actions, if required, are complete;
- branch protections/rulesets are restored and re-verified;
- every rewritten ref update was bound to its captured pre-rewrite OID with an explicit expected-value lease, and any mismatch caused an abort/re-investigation rather than an overwrite;
- required reviews/status checks/force-push restrictions are restored;
- collaborator clone cleanup acknowledgments are complete;
- bots/automation use rewritten canonical refs;
- CI/build/deploy integrations are healthy after remediation;
- rollback backup exists and is access-controlled.

## Closure statuses

Current:

```text
CURRENT_TREE_SANITIZED=PASS
PUBLIC_HISTORY_PURGED=NO
REPOSITORY_PRIVATE=NO
BRANCH_PROTECTION_EXCEPTION_EXECUTED=NO
PER_REF_EXPECTED_VALUE_LEASES=NOT_EXECUTED
COLLABORATOR_CLONE_CLEANUP=NOT_EXECUTED
FORK_CLEANUP=NOT_EXECUTED
GITHUB_SUPPORT_PURGE=NOT_REQUESTED
CONFIDENTIALITY_CLOSED=NO
```

Target:

```text
CURRENT_TREE_SANITIZED=PASS
PUBLIC_HISTORY_PURGED=PASS_OR_NOT_PUBLICLY_REACHABLE
REPOSITORY_VISIBILITY=APPROVED_TARGET_STATE
BRANCH_PROTECTION=RESTORED_AND_VERIFIED
PER_REF_EXPECTED_VALUE_LEASES=PASS
COLLABORATOR_CLONE_CLEANUP=PASS
FORK_CLEANUP=PASS_OR_NOT_APPLICABLE
GITHUB_SUPPORT_PURGE=COMPLETE_IF_REQUIRED
CONFIDENTIALITY_CLOSED=PASS
```

## Approval boundary

Executing a history rewrite, force-push/force-with-lease, temporary branch-protection exception, or repository visibility change is a high-impact repository operation. It must not be represented as complete until actually performed and verified.
