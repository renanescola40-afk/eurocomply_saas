# ADR: Final Eleven Enterprise Controls Closeout

Date: 2026-07-21
Status: Proposed

## Context

The exact-SHA scorecard remained at 46%. The protected runtime registry could promote 43 open controls, but eleven controls had no complete path into the promotion engine: live storage isolation, security-event execution, branch protection, observability smoke, final bundle coherence, external security review, release approval, legal-document review and edge protection.

## Decision

Expand the protected campaign from ten to thirteen lanes by adding Final Technical Controls, Repository and Final Assurance. Final Technical Controls combines synthetic storage isolation and rolled-back security-event execution in one protected workflow. Extend Platform evidence to cover the observability smoke that it already executes. Add a deterministic REL-10 coherence proof that is emitted only after every other control is PASS and no evidence was rejected.

Human and external evidence is represented only by sanitized metadata, immutable SHA-256 report digests, freshness windows, assessed-SHA ancestry, change-impact review and two reviewers distinct from the preparer. The protected `production-enterprise-assurance` environment remains the human approval boundary.

## Security boundary

No workflow can claim an external review, legal approval or provider protection from repository code alone. The Open assurance scaffold intentionally fails. Raw reports, legal advice, provider URLs, credentials, customer data and private evidence are forbidden from the retained bundle. Synthetic storage objects are removed, synthetic database writes are rolled back, and neither their identifiers nor content are retained.

## Consequences

Once all live lanes pass and real assurance metadata is accepted, the deterministic closeout can promote 99 controls. REL-10 is then promoted from the accepted final manifest itself, producing a 100% GO only when no other control remains open.

## Rollback

Revert the lane registry, new proof workflows, assurance validator, coherence logic, tests and documentation together. The release remains NO_GO until an equivalent safe path exists.
