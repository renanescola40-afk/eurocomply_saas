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

1. Freeze merges temporarily.
2. Record the exact current default-branch head.
3. Export a full mirror backup of all refs.
4. Inventory protected branches, tags, release refs and open PRs.
5. Inventory deployment/integration dependencies that consume commit SHAs.
6. Identify every affected commit and path without copying the sensitive text into a new public artifact.
7. Decide whether the repository will remain public or be made private.
8. Obtain explicit owner authorization for history rewrite / force-with-lease.
9. Prepare rollback refs outside the public repository.
10. Notify any required internal operators only through approved channels.

## Preferred remediation sequence

### Option A — Private-first containment

Use when immediate confidentiality reduction is more important than preserving public accessibility.

- change repository visibility to private;
- verify GitHub Actions, Vercel and other integrations still operate;
- then perform history rewrite if permanent purge is required;
- rotate any credentials only if credentials were exposed (none are claimed exposed by this incident);
- validate that historical sensitive strings no longer resolve through ordinary repository access.

### Option B — Public repository history rewrite

Use only with explicit destructive-change approval.

- create a mirror clone;
- rewrite every affected ref so the sensitive historical content is removed;
- preserve unrelated repository content and authorship where practicable;
- force-update affected refs with lease protection;
- re-create or reconcile tags only after verification;
- validate branch protections and CI after rewrite;
- contact GitHub Support if cached pull-request refs, forks or inaccessible server-side refs continue to expose the material.

## Important GitHub limitation

Rewriting the default branch alone may not purge all hosted copies. Pull-request refs, forks, caches or other server-side references may preserve historical objects. A complete purge may require GitHub Support and/or repository visibility changes.

## Verification gates

Do not mark confidentiality CLOSED until all applicable checks pass:

- default branch no longer exposes the historical content;
- affected branches/tags no longer expose it;
- pull-request refs are evaluated;
- public code search does not surface it;
- direct historical commit URLs are no longer publicly usable where purge is expected;
- GitHub Support actions, if required, are complete;
- CI/build/deploy integrations are healthy after remediation;
- rollback backup exists and has been access-controlled.

## Closure statuses

Current:

```text
CURRENT_TREE_SANITIZED=PASS
PUBLIC_HISTORY_PURGED=NO
REPOSITORY_PRIVATE=NO
GITHUB_SUPPORT_PURGE=NOT_REQUESTED
CONFIDENTIALITY_CLOSED=NO
```

Target:

```text
CURRENT_TREE_SANITIZED=PASS
PUBLIC_HISTORY_PURGED=PASS_OR_NOT_PUBLICLY_REACHABLE
REPOSITORY_VISIBILITY=APPROVED_TARGET_STATE
GITHUB_SUPPORT_PURGE=COMPLETE_IF_REQUIRED
CONFIDENTIALITY_CLOSED=PASS
```

## Approval boundary

Executing a history rewrite, force-push/force-with-lease, or repository visibility change is a high-impact repository operation. It must not be represented as complete until actually performed and verified.
