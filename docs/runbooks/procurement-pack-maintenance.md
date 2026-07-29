# Procurement pack maintenance runbook

## Trigger conditions

Run this process after a provider change, region change, control redesign, legal-document update, certification event, security incident affecting public claims or material release.

## Procedure

1. Compare the active production configuration with the public catalog.
2. Confirm every `implemented` control still has repository and runtime evidence.
3. Downgrade uncertain controls to `configured` or `evidence-required` rather than overclaiming.
4. Confirm provider purpose, status and region disclosure.
5. Confirm every localized trust-document route exists.
6. Scan the JSON response for secrets, tenant identifiers and customer data.
7. Update `PROCUREMENT_PACK_VERSION` when meaning changes.
8. Run unit, E2E, lint, typecheck, build, route-quality and public-claims gates.
9. Record the reviewer and review date in the release evidence.
10. Publish customer-specific evidence only through approved private channels.

## Incident handling

When a public statement is inaccurate, remove or downgrade it immediately, preserve the previous version in Git history, notify Security and Legal owners, assess affected buyers, and issue a corrected pack. Do not invent retrospective evidence.

## Rollback

Revert the catalog/page/API commit together. The three surfaces form one contract and should not be rolled back independently.
