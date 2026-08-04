# ADR: Repository Rulesets as a Platform-Control Evidence Fallback

- Status: Accepted
- Date: 2026-08-04
- Decision owners: Security Engineering, SRE and Release Engineering

## Context

The final Enterprise closeout requires exact-SHA evidence that the canonical `main` branch enforces pull requests, reviews, required checks, conversation resolution, update freshness, force-push blocking and deletion blocking.

The existing workflow reads GitHub's classic branch-protection endpoint. In the current repository context, that endpoint may return `403` even though repository rules are configured through GitHub Repository Rulesets. Treating `403` as passing would be false. Treating every `403` as permanently unresolvable leaves a platform-control gap even when equivalent read-only metadata is available.

## Decision

Keep classic branch protection as the primary evidence source and add GitHub Repository Rulesets as a secondary read-only source.

The fallback is accepted only when:

- the target and checkout equal the current `main` SHA;
- rulesets are active;
- rulesets target `main` after include/exclude evaluation;
- cumulative rules prove the full canonical policy;
- no bypass actor exists;
- evidence is sanitized and workflow-run bound;
- the existing downstream validator accepts the generated artifact.

## Alternatives considered

### Accept the classic API `403`

Rejected. API denial is absence of evidence, not proof of protection.

### Require a broad personal access token

Rejected as the only solution. A stronger read token may still be used, but Enterprise evidence should consume the least-privileged metadata source available.

### Automatically configure repository rules

Rejected. Evidence generation must remain read-only and separated from repository administration.

### Count workflow files as branch-protection proof

Rejected. Workflow definitions do not prove that GitHub enforces them as required checks.

## Consequences

### Positive

- the four remaining platform runtime points can be proven without weakening truth boundaries;
- ruleset-based repositories are supported;
- API-source downgrade remains fail-closed;
- PRs can validate contracts without receiving production secrets;
- one canonical evidence format continues to feed the scorecard.

### Negative

- GitHub ruleset semantics must be maintained as the API evolves;
- bypass actors are treated strictly and may require owner remediation;
- inherited rulesets can require additional read permissions;
- a successful proof remains time-bound to one exact SHA.

## Rollback

Revert the fallback builder and restore the workflow's classic builder command. Existing evidence produced by the fallback must remain retained with its provenance; it must not be rewritten or silently reclassified.
