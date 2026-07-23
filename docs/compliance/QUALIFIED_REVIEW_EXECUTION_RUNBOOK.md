# Qualified Review Execution Runbook

## Purpose

Operationalize the eight qualified legal and methodology reviews that represent the remaining 51 completion points after implementation, CI and runtime evidence are complete.

## Procedure

1. Select the exact protected `main` SHA to review.
2. Run `Qualified Review Execution` in report mode to generate eight immutable review packets.
3. Assign each packet to a reviewer whose qualifications match the scope.
4. Require disclosure of identity, organization, qualification, independence and conflicts.
5. Require answers to every packet question and a finding for each answer.
6. Place completed packages in `docs/compliance/evidence/staging/<requirement>.signoff.json` through a restricted review branch.
7. Run report mode and resolve every invalid or missing result.
8. Run strict closeout with `CLOSE_QUALIFIED_REVIEWS` in the protected `qualified-legal-review` environment.
9. Review the generated promotion plan manually.
10. Open a separate promotion PR that copies only accepted packages to their canonical accepted paths.

## Fail-closed rules

A package is rejected when its SHA differs, its reviewer is unidentified or unqualified, independence is not affirmed, any finding is `FAIL`, required conditions are absent, the review is expired, integrity hashes are malformed, or placeholder content remains.

## Security and privacy

Do not commit raw email addresses, personal IDs, contracts or confidential legal correspondence. Store only a SHA-256 hash of the normalized reviewer email and the minimum professional information needed for auditability.

## Truth boundary

An accepted package proves that a named qualified reviewer assessed a defined packet for an exact code SHA. It is not certification, regulator approval, a legal guarantee or proof that every customer deployment complies with the EU AI Act.
