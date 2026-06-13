# Release Approval Linkage

This document links the release approval record to the release evidence package.

## Canonical approval artifact

`docs/RELEASE_APPROVAL_RECORD.md` is the canonical sign-off artifact for every release candidate promoted beyond private beta.

It must reference:

- the release version or tag;
- the exact commit SHA promoted;
- the deployment target;
- the evidence package location;
- the release owner;
- the final approver;
- any accepted exceptions;
- rollback ownership.

## Evidence package relationship

The approval record must be completed together with:

- `docs/RELEASE_EVIDENCE_CHECKLIST.md`;
- `docs/RELEASE_CANDIDATE_VALIDATION.md`;
- supply-chain triage evidence;
- live database isolation evidence;
- audit-chain integrity evidence;
- upload scanning policy evidence;
- billing validation evidence;
- observability evidence;
- external review evidence when required by the target tier.

## Release rule

A release cannot be considered production-ready unless the approval record is completed or the release owner explicitly documents why the release remains private beta.

Enterprise procurement should not proceed without a completed approval record and a complete evidence package.
