# Runbook — Enterprise Conversation Runtime Closeout

1. Confirm all four source workflows completed successfully.
2. Record their GitHub Actions run IDs.
3. Read the current `main` SHA.
4. Dispatch the protected closeout workflow.
5. Approve the `production` environment request.
6. Download the final artifact and verify `SHA256SUMS`.
7. Confirm the JSON has `CONVERSATION_COMPLETE`, `100`, and no blockers.

## Failure handling

- `missing`: rerun the corresponding proof workflow.
- `sha_mismatch`: regenerate every proof for the current `main` SHA.
- `not_complete`: inspect the source artifact; do not override the assessor.
- artifact download ambiguity: ensure each source run exposes one canonical JSON artifact.

The workflow is read-only and must never be changed to fabricate or patch source evidence.
