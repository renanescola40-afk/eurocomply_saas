# Enterprise Owner Execution Packets

## Purpose

Convert the accepted Enterprise Closeout Queue for one exact `main` SHA into domain-specific execution packets. The packets make the remaining work assignable and reviewable without treating coordination artifacts as evidence.

## Inputs

The protected workflow requires:

- the exact current `main` SHA;
- the workflow run ID that produced the `enterprise-closeout-queue` artifact;
- approval for the `enterprise-closeout` GitHub environment.

The workflow fails if the checked-out SHA is not still the current `main` SHA.

## Packet contents

Every domain packet contains:

- an immutable packet ID bound to the release SHA;
- accountable owner;
- state: `COMPLETE`, `EXECUTION_REQUIRED`, or `OWNER_ACTION_REQUIRED`;
- dependencies;
- required action;
- required evidence;
- acceptance criteria;
- prohibited substitutions;
- due date and expiry;
- independent-review requirement;
- empty evidence-digest and reviewer-decision fields until genuine completion.

## Operating sequence

1. Run **Enterprise Final Decision Compiler** for the exact current `main` SHA.
2. Run **Enterprise Closeout Orchestrator** using that final-decision workflow run.
3. Run **Enterprise Owner Execution Packets** using the closeout workflow run.
4. Assign each incomplete packet to the named accountable owner.
5. Execute the required real-world action.
6. Store genuine SHA-bound evidence with provenance and a digest.
7. Obtain independent review where required.
8. Recompile the authoritative Enterprise Final Decision.

## Safety boundary

These packets do not:

- grant Enterprise GO;
- execute production changes;
- perform legal or security reviews;
- approve migrations;
- replace production runtime evidence;
- convert templates, comments, or screenshots without provenance into accepted evidence.

`enterpriseGoGrantedByThisArtifact` is always `false`.

## Expiry and stale work

Incomplete packets expire after 30 days. A packet tied to an old SHA must be discarded and regenerated. Completion against a newer deployment does not satisfy an older packet.

## Related control tower items

Use the generated packets when updating #1032. Runtime and Supabase execution packets also relate to #198 and #778. External security and qualified legal-review packets relate to #1395.
