# Prohibited Practices Operational Workspace

## Purpose

The workspace at `/{locale}/dashboard/prohibited-practices` turns the Article 5 governance domain into a customer-facing workflow. It supports structured review and evidence preparation; it does not determine legal applicability, certify compliance or authorize deployment.

## Workflow

1. Create a versioned review for an AI-system reference.
2. Complete all eight Article 5 signal assessments.
3. Record rationale, deployment context and consequence analysis.
4. Assign an independent reviewer and, for positive signals, a legal reviewer.
5. Attach organization-scoped evidence with a SHA-256 digest.
6. Resolve every unknown or positive signal.
7. Approve only when all eight signals are evidence-complete and no prohibited conclusion or severe finding remains.

## API boundary

- `GET /api/ai-governance/prohibited-practices`
- `POST ...?workflow=review_create`
- `POST ...?workflow=signal_update`
- `POST ...?workflow=evidence_submit`
- `POST ...?workflow=review_approve`

Reads require `read_ai_governance`. Mutations require `manage_ai_governance`, trusted Origin, bounded Zod input, distributed fail-closed rate limiting and durable audit persistence.

## Transaction integrity

Review version allocation and creation of the eight signal rows occur in one transaction under an advisory lock. Evidence triggers synchronize `evidence_count`, signal state and parent review counters. Final approval locks the review, validates all eight signals again, updates the review and appends the decision in the same transaction.

## Fail-closed rules

Approval is rejected when any signal is unknown, unresolved, without evidence, without digest, without independent review, legally prohibited, or when high/critical findings remain. A positive signal requires an accountable legal conclusion; an exception-supported conclusion also requires a governed exception claim in the underlying domain.

## Evidence boundary

The workflow records what users supplied and the decisions made by accountable reviewers. It does not verify evidence truth, legal basis, necessity, proportionality, regulator acceptance or real-world system behaviour.
