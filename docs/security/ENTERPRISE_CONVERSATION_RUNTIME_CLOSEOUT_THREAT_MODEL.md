# Threat Model — Enterprise Conversation Runtime Closeout

## Protected assets

Release decision integrity, exact-SHA provenance, runtime evidence, approval history and retained completion artifact.

## Threats and controls

- **Stale evidence reuse:** every proof must match current `main`.
- **Partial proof promotion:** all four proof classes are mandatory.
- **Manual claim substitution:** only machine output can emit completion.
- **Artifact tampering:** source and final evidence receive SHA-256 digests.
- **Credential exposure:** workflow uses read-only permissions and stores no secrets.
- **Unapproved closure:** protected `production` environment and explicit confirmation are required.
- **Universal overclaim:** the result is scoped to the exact assessed release SHA.
