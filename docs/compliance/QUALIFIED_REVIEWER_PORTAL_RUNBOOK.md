# Qualified Reviewer Portal Runbook

## Purpose

Provide a bounded channel for a genuine assigned reviewer to inspect one qualified-review assignment, attest independence, submit an exact-SHA opinion and terminate access.

## Operator flow

1. Verify that the reviewer record is active, qualified and assigned to the correct workstream.
2. Issue an invitation with an expiry no longer than 14 days.
3. Deliver the one-time token through an approved private channel.
4. Confirm that the reviewer accepts the invitation and receives an eight-hour session.
5. Require independence and scope attestation before submission.
6. Require the submission SHA to equal the campaign SHA.
7. Revoke the invitation and all sessions immediately when the reviewer changes, a conflict appears or access is suspected to be exposed.
8. Run the backend expiry function as part of scheduled maintenance.

## Incident actions

- Exposed invitation token: revoke the assignment invitation and issue a new token.
- Exposed session token: revoke all sessions for the assignment.
- Conflict disclosed: do not accept a submission; revoke access and reassign.
- Wrong SHA: reject the submission and regenerate the evidence package for the current exact SHA.
- Storage or rate-limit outage: fail closed and do not bypass controls.

## Evidence boundary

Repository code proves intended controls only. Production completion requires a real reviewer, real qualifications, genuine review work, retained evidence and an independent approval. The portal does not provide certification, regulator approval, notified-body assessment or legal advice.
