# Prohibited Practices Runtime Proof

## Purpose

This proof validates the database boundary for the customer-facing Article 5 workflow against an isolated non-production Supabase/Postgres environment.

It proves that:

- a valid tenant member can create a versioned prohibited-practices review;
- exactly eight signal assessments are created atomically;
- the generated review and signals remain bound to tenant A;
- tenant B cannot resolve the same resource under its organization scope;
- all proof fixtures are rolled back;
- the workflow produces a retained evidence artifact without printing database credentials.

## Execution

Run the GitHub Actions workflow `Prohibited Practices Runtime Proof` with:

- two distinct organization UUIDs;
- an actor UUID that is an active member of tenant A;
- the protected environment `enterprise-runtime-proof`;
- secret `ENTERPRISE_RUNTIME_PROOF_DATABASE_URL` pointing only to an isolated proof database.

The workflow must never target production.

## Evidence acceptance

An accepted artifact must contain a `passed` result, the two distinct tenant identifiers and `rolled_back=true`. The workflow run URL, exact commit SHA, artifact digest, executor and execution date must be recorded in the canonical evidence register before promoting the related scorecard control.

## Remaining boundaries

This proof does not establish legal correctness, evidence truth, user-interface accessibility, translation quality, penetration-test completion or production readiness by itself. Forced audit-outage behavior and full approval-path evidence require separate proofs.
