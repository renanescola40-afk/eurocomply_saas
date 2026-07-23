# Qualified Review Assurance Campaign

This campaign turns qualified human review into retained, auditable evidence without treating code or self-attestation as legal approval.

## Operator flow

1. Select a requirement from the campaign registry.
2. Assign a reviewer whose active qualification covers the stated scope.
3. Complete and retain the conflict-of-interest assessment.
4. Review the exact `main` SHA and referenced evidence package.
5. Record the decision, limitations, dates and SHA-256 digest.
6. Store the accepted JSON at `docs/compliance/evidence/accepted/<requirement-id>-qualified-review.json`.
7. Run the report workflow.
8. Run strict mode only through an authorized release decision.

## Fail-closed rules

Missing identity, qualification, independence, exact SHA, validity dates or digest blocks acceptance. Rejected, expired, placeholder or synthetic records receive no completion credit.

## Truth boundary

An accepted review proves that a named qualified person reviewed a defined evidence package. It does not certify customer compliance, replace regulator action, authorize CE marking or guarantee a legal outcome.
