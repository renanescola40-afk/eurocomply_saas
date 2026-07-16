# ADR-0081: Define repository code ownership

- Status: Accepted
- Date: 2026-07-16
- Scope: repository governance, security review routing, release controls

## Context

The repository's protected-branch configuration requires review from Code Owners, but the default branch did not contain `.github/CODEOWNERS`.

Without a CODEOWNERS file, GitHub has no repository-defined mapping from changed paths to responsible reviewers. That can make the configured review control ineffective for security-sensitive changes and leaves ownership implicit rather than reviewable in version control.

This finding is based on repository configuration expectations and source state only. It does not prove that an unauthorized merge occurred, that branch protection was bypassed, or that an external audit identified the issue.

## Decision

Add `.github/CODEOWNERS` with:

- a default owner for every repository path;
- explicit ownership for GitHub workflows and dependency manifests;
- explicit ownership for API, authentication, billing, and security code;
- explicit ownership for Supabase policies and migrations;
- explicit ownership for security, release, evidence, and decision records.

Add a source-contract test so removal of the file or critical ownership rules fails the normal test suite.

## Consequences

### Positive

- GitHub can request the configured owner when protected paths change;
- security- and release-sensitive ownership is explicit and version controlled;
- ownership changes become reviewable repository changes;
- accidental removal of critical mappings is covered by an automated contract test.

### Limitations

- the repository currently has one configured maintainer owner, so this change does not establish independent two-person review;
- CODEOWNERS only enforces review when the repository's branch or ruleset settings require Code Owner approval;
- this change does not itself verify the live ruleset, organization membership, reviewer availability, or production deployment controls;
- GitHub remains authoritative for whether a requested reviewer is eligible to approve a specific pull request.

## Risk

The principal operational risk is reviewer concentration: sensitive changes can be blocked when the sole listed owner is unavailable. A future multi-maintainer or team-based ownership model should replace the individual owner when eligible reviewers exist.

## Evidence

Repository evidence for this decision is limited to:

- absence of `.github/CODEOWNERS` on the audited default-branch SHA;
- the added CODEOWNERS rules;
- the focused source-contract test;
- GitHub Actions results for the exact pull-request head SHA.

No runtime evidence, penetration test, external audit, incident, or compliance certification is claimed.

## Rollback

Revert the pull request. GitHub will again have no repository-defined Code Owner mapping. No database migration, provider rollback, secret rotation, deployment rollback, or customer-data repair is required.
