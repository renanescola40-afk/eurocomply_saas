# ADR — Exact-SHA upload malware scanner runtime proof

- **Date:** 2026-08-04
- **Status:** Accepted
- **Scope:** upload security runtime evidence and P0 evidence promotion

## Context

The repository already enforced upload size, extension, MIME, magic-number, filename, tenant path and fail-closed malware-scanner controls. `RISCK COMPLY Upload Security CI` also started a real ClamAV service and generated a clean-scan evidence file.

The existing evidence could not close the P0 control reliably because:

1. the committed JSON was stale;
2. its runtime context did not include canonical repository and branch fields;
3. the proof artifact had a generic name rather than an exact-SHA identity;
4. the P0 workflow evaluated the checked-out stale JSON instead of recovering the successful workflow artifact;
5. there was no live proof that an infected test fixture was blocked;
6. manual register promotion created a second source of truth.

## Decision

Use a protected artifact handoff between the scanner workflow and the P0 source of truth.

### Producer

`RISCK COMPLY Upload Security CI`:

- checks out the exact candidate SHA;
- starts a real ClamAV service;
- proves a clean PDF receives a clean verdict;
- proves an in-memory antivirus test fixture receives a blocked verdict;
- normalizes repository, branch, SHA, workflow, run and attempt provenance;
- validates the canonical evidence independently;
- uploads `upload-security-runtime-proof-<sha>`;
- never writes or commits the P0 policy register.

### Consumer

`P0 Runtime Evidence`:

- re-runs after a successful scanner workflow;
- checks out the scanner workflow's exact head SHA;
- reads GitHub Actions with `actions: read` only;
- accepts only successful `push` or `workflow_dispatch` runs on `main`;
- requires one non-expired artifact with the exact expected name;
- bounds API responses, artifact size, ZIP entry count and evidence size;
- rejects traversal, absolute paths, duplicate evidence entries and provenance mismatch;
- replaces the stale workspace evidence only after validation;
- regenerates the authoritative exact-SHA P0 register.

## Security invariants

- A PR artifact cannot satisfy the `main` P0 control.
- A successful run for another SHA cannot satisfy the current SHA.
- A failed or cancelled scanner workflow cannot be consumed.
- Mock, disabled, unavailable, timeout, suspicious, infected and malformed results remain fail-closed.
- Provider response bodies, messages, signature names, credentials and fixture bytes are not persisted.
- The industry-standard antivirus test signature is assembled in memory and is not committed contiguously.
- The consumer has no write permission to repository contents.
- Artifact absence or validation failure keeps the control open.

## Evidence boundary

This proof demonstrates that the exact repository SHA can communicate with a real ClamAV service, allow a clean fixture and block a standard malicious test fixture while preserving fail-closed controls. It does not prove detection of every malware family, production-provider availability, provider SLOs or continuous production monitoring.

## Consequences

### Positive

- The upload malware P0 control can be refreshed automatically for every integrated SHA.
- Evidence cannot be promoted by editing Markdown or a committed JSON snapshot.
- A clean-only false positive is prevented by the separate blocking proof.
- The source artifact remains reusable by the P0 register and final closeout workflows.

### Costs

- The workflow requires a ClamAV container and can take longer while virus definitions initialize.
- GitHub artifact retention remains subject to repository/provider policy.
- Production malware-provider health still requires separate operational monitoring.

## Rollback

Revert the producer normalization, blocking proof, artifact fetcher and P0 workflow integration together. After rollback, the upload malware P0 control must return to `Open`; the stale committed evidence must not be treated as current proof.
