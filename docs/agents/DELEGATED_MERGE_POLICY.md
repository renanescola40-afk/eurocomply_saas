# Bounded delegated non-production merge policy

Status: proposed operating model; no activation record is supplied by this amendment.

## Activation and authority

This policy may become available only after an eligible independent human reviewer approves the exact amendment HEAD and the human owner merges it under the previously effective rules. An agent must not approve or merge this amendment, its activation, or later changes to merge authority.

Availability is not activation. Before any delegated merge, the human owner must approve a versioned activation record through a separately reviewed, human-merged PR. The record must identify the authenticated operator principal, repository, allowed target branches, allowed PR scope, expiry, human owner decision, reviewer qualifications, effective mandatory check names and provider identities, security-review requirements, and evidence-retention location. Missing, expired, revoked or ambiguous authority means human-only merge.

Actual provider permissions and effective branch rules must independently permit the operation. Require enforced PR review, exact-HEAD required checks, conversation resolution, stale-review dismissal or equivalent exact-HEAD verification, and no bypass for the operator. Preserve all stricter existing protections, including signed commits, code scanning and protected environments. If protections cannot be read or are absent, delegation is BLOCKED; an empty required-check set is never sufficient.

This policy grants no credentials, new identity, paid capacity or automatic runtime. No activation or provider configuration is changed by this document.

## Per-merge decision

A delegated operator may perform a single direct, non-production merge only when all of the following have been freshly verified and recorded:

1. The activation record is valid for the actual principal, repository, target and PR.
2. The PR is open, non-draft and conflict-free; the complete changed-file set and merge method are within the approved scope.
3. Every mandatory check has succeeded on the exact current HEAD from its expected provider. A missing, failed, cancelled, skipped, neutral, stale or unknown result blocks delegation. Source-only CI cannot replace runtime, security or release evidence. CircleCI success never substitutes for a separately required GitHub check.
4. An eligible independent human reviewer, distinct from the author, latest pusher and merging principal, approved the exact HEAD. Reviewers must have the qualifications required for the change. Agent reviews are supplemental and cannot satisfy this requirement. No self-review, self-approval or dismissed/stale approval is accepted.
5. Security-critical files have additional qualified human security review on the exact HEAD. This includes auth, authorization, RBAC, RLS, tenancy, migrations, billing, webhooks, secrets, audit/evidence, CI/release configuration and dependency authority. The activation record must identify the responsible reviewer; uncertainty blocks delegation.
6. All review conversations are resolved legitimately. No material unresolved risk, incident hold, protected-path blocker, legal interpretation or owner-only decision remains. A request to resolve a conversation is not evidence that its issue is fixed.
7. The merge cannot trigger a production deployment, promotion, production migration or other production write. Verify the effective deployment strategy, workflows and provider integrations rather than relying on one repository setting. If this cannot be established, the human release process remains required.
8. Preserve a reviewable decision record before merging: PR URL, base and HEAD SHAs, actual principal, activation reference, protection readback, exact check IDs/results/URLs, approval IDs/commit IDs/reviewer qualifications, conversation state, change risks, rollback and artifact retention.
9. Re-read HEAD, base, approvals and check state immediately before the direct merge; require an exact-HEAD API precondition. Any changed SHA or state invalidates the decision. Never enable auto-merge, force-push, use administrator bypass, manufacture a successful status or remove a required check.
10. Verify the resulting merge commit, parents and target branch afterward and append the provider response and final SHA to the evidence record. Do not retry a failed or uncertain merge blindly.

A successful merge is integration evidence only. It does not close an Enterprise gate, authorize production release, establish legal acceptance or grant customer/procurement GO.

## Boundaries and revocation

The existing PR classifier, Codex autofix and scheduled automation retain their current human-only and read-only merge restrictions. They receive no merge token, permission, workflow or policy expansion. This exception applies only to the specifically activated interactive operator.

Governance changes, activation/revocation decisions, material risk acceptance and production releases remain human-controlled. Protected environments remain protected. No production data/Auth/Storage writes, Stripe LIVE mutations, customer emails, new costs or protected DataGuard changes are permitted by this policy.

The owner may revoke authority immediately; record revocation durably before another attempt. Any failed condition suspends delegation without weakening the condition. Continue independent engineering and prepare the exact human action needed.

## Rollback

Before each merge retain the prior target SHA and a reviewed revert approach. Reverting code must follow the same applicable review/check rules; it is not permission to force-push or mutate production. Reverting this amendment or withdrawing activation restores the universal human-only merge path. Retain all decision evidence.

## Amendment decision record — 2026-11-03

Problem: owner-delegated engineering cannot currently perform the final merge even after qualified review. The owner requested an auditable bounded model, without bypasses or production deployment authority.

Choice: separate mechanical non-production integration from human acceptance and production release. The first amendment and every activation remain human-merged. No operator, activation, credentials or provider protections are created here.

Alternatives rejected: blanket agent merge permission; treating chat authorization as a provider review; removing required checks when hosted CI is unavailable; enabling the existing classifier to merge.

Risk: a mistaken scope or deployment assessment could turn an integration into a production action. Mitigation: explicit human-approved scope, provider-enforced protections, exact-HEAD checks, qualified independent review and fail-closed deployment verification. This document is a governance proposal, not an implemented enforcement service.

Compatibility: the application, workflows, scoring denominators, existing approvals and classifier configuration are unchanged. No current PR becomes eligible solely because this amendment exists.

Validation: inspect the four-document diff and relative links; verify that classifier/autofix authority is unchanged. Required CI and qualified human review must still succeed before this amendment is ready for human merge.
