# Threat model — Upload scanner runtime proof

## Assets

- Integrity of the P0 runtime evidence register.
- Exact association between source SHA and scanner result.
- Malware-scanner credentials and connection details.
- Uploaded customer documents and tenant metadata.
- GitHub Actions artifacts used by release gates.

## Trust boundaries

1. Repository source → GitHub Actions runner.
2. Runner → local ClamAV service container.
3. Scanner workflow → uploaded GitHub artifact.
4. P0 workflow → GitHub Actions API and artifact download.
5. Downloaded ZIP → canonical evidence JSON.
6. Canonical evidence JSON → generated P0 register.

## Threats and controls

### T1 — Reuse a passing artifact from another commit

**Attack:** submit a clean artifact generated for an earlier SHA.

**Controls:**

- exact full SHA in workflow checkout;
- artifact name includes the SHA;
- run `head_sha` must equal the assessed SHA;
- evidence `runtimeContext.commitSha` must equal the assessed SHA;
- source workflow and evidence-integrity flags must be exact-SHA bound.

### T2 — Use a pull-request proof as production evidence

**Attack:** consume a PR run where the attacker controls source changes.

**Controls:**

- consumer accepts only `head_branch=main`;
- consumer accepts only `push` or trusted manual dispatch events;
- `pull_request` artifacts remain useful for pre-merge validation but cannot close P0 on `main`.

### T3 — Artifact substitution or ambiguity

**Attack:** upload multiple artifacts or duplicate evidence files and rely on non-deterministic selection.

**Controls:**

- exactly one artifact must match `upload-security-runtime-proof-<sha>`;
- exactly one evidence entry must exist in the ZIP;
- duplicate matches fail closed;
- run ID and run attempt are validated in the evidence.

### T4 — ZIP traversal or decompression abuse

**Attack:** use absolute paths, `..`, Windows paths, excessive entries or oversized content.

**Controls:**

- reject unsafe path segments, absolute paths and backslashes;
- cap entries at 20;
- cap GitHub API payload at 1 MiB;
- cap artifact at 5 MiB;
- cap extracted JSON at 1 MiB;
- extract one entry with `unzip -p`; never extract the archive tree into the workspace.

### T5 — Fake clean provider

**Attack:** select a mock, disabled or unsupported scanner and claim a clean verdict.

**Controls:**

- enterprise scan must be required;
- provider must be one of the supported real providers;
- ClamAV workflow uses a real service container and INSTREAM protocol;
- provider status, real-provider flag and clean verdict are independently validated.

### T6 — Clean-only implementation that never blocks malware

**Attack:** a stub returns `clean` for every file.

**Controls:**

- separate in-memory antivirus test fixture;
- ClamAV must return a blocked classification;
- unexpected `OK`, timeout, unavailable, error or unrecognized response fails the workflow;
- blocking proof is bound to the same SHA/run.

### T7 — Leak scanner responses or signatures

**Attack:** persist provider bodies, signature names, endpoints, credentials or fixture bytes in logs/artifacts.

**Controls:**

- evidence contains only normalized classifications and hashes;
- raw response and signature name are never written;
- fixture is generated in memory and only its SHA-256/size are recorded;
- HTTP authorization values and ClamAV host/port are excluded from evidence;
- integrity flags are required to be explicitly false for sensitive persistence.

### T8 — Manual evidence promotion

**Attack:** edit the P0 Markdown or committed evidence snapshot to mark the control complete.

**Controls:**

- scanner workflow has `contents: read` only;
- `--update-register` is prohibited by workflow contract tests;
- P0 state is generated from validated evidence, not copied from Markdown;
- missing artifacts remain `Open`.

### T9 — Stale evidence

**Attack:** retain an old successful scan indefinitely.

**Controls:**

- evidence must be no older than seven days;
- integrated main changes trigger a new scanner run;
- P0 workflow re-runs after the successful producer workflow;
- exact SHA prevents old evidence from satisfying a new commit even within the freshness window.

## Residual risks

- CI ClamAV availability does not prove production scanner availability.
- Antivirus engines cannot guarantee detection of all malicious content.
- Container image freshness and signature database availability remain upstream dependencies.
- GitHub artifact retention may be shorter than requested by repository policy.
- Application-level upload behavior still depends on correct production environment configuration.

## Required follow-up outside this PR

- monitor the production scanner provider and alert on unavailability/error rate;
- verify production upload routes use `REQUIRE_MALWARE_SCAN_FOR_UPLOADS=true`;
- retain incident procedures for malware detections and false positives;
- periodically test additional document formats and scanner timeout behavior.
