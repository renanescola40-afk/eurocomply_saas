# Threat Model: Enterprise Closeout Artifact Retrieval

## Scope

This model covers the read-only path that discovers GitHub Actions runs, downloads exact-name artifacts, extracts canonical JSON evidence, and produces the final Enterprise conversation closeout decision.

It does not cover the correctness of the production systems that generated the source evidence. Each source artifact remains governed by its own runtime validator and protected workflow.

## Assets

- exact current `main` SHA;
- production-final Enterprise evidence;
- Enterprise readiness scorecard;
- persistent execution state;
- release Go/No-Go decision;
- Stripe runtime proof;
- final closeout decision and integrity digest;
- GitHub Actions token confidentiality.

## Trust boundaries

1. GitHub Actions metadata API.
2. GitHub artifact download endpoint and redirect chain.
3. ZIP archive parser.
4. canonical evidence validators.
5. protected `production` environment approval.
6. retained closeout artifact.

## Threats and controls

| Threat | Impact | Control |
| --- | --- | --- |
| A successful PR run is mistaken for trusted `main` evidence | Untrusted code could manufacture apparent proof | Accept only exact-SHA `main` runs triggered by `push` or `workflow_dispatch` |
| A stale run is selected | Evidence could describe an older deployment | Require exact 40-character current `main` SHA and select only matching runs |
| An expired or similarly named artifact is accepted | Wrong evidence could enter the final decision | Require exact artifact name ending in the target SHA and reject expired artifacts |
| The first JSON file in an archive is used | An attacker could reorder files or add a decoy | Extract every fixed canonical path by exact match and require exactly one match |
| ZIP path traversal or symlink entry | Artifact extraction could overwrite arbitrary files | Never extract archive paths to disk; read exact entries in memory and reject symlinks |
| ZIP bomb or oversized evidence | Runner resource exhaustion | Limit archive bytes, entry count, total uncompressed bytes, per-file bytes, and compression ratio |
| Encrypted or malformed entries hide content | Validation could be bypassed or fail unpredictably | Reject encrypted entries and require UTF-8 parseable JSON |
| API/provider error text leaks data into retained artifacts | Secrets or internal provider details could persist | Retain only bounded failure enums, fixed names/paths, numeric IDs, and trusted event enums |
| Missing artifact aborts before diagnostics | Operators cannot distinguish missing proof from code failure | Build an `Open/blocked` retrieval manifest and continue to the assessor |
| Diagnostics are lost when the final gate fails | No durable remediation trail | Upload closeout JSON and checksums before enforcing completion |
| Missing evidence is counted as partial success | False Enterprise claim | Retrieval failure is a blocking validation and the final enforcement step remains fail-closed |
| Workflow mutates repository or provider configuration | Closeout could alter the object it assesses | Permissions remain `actions: read` and `contents: read`; no write token or mutation API is used |
| Artifact provenance is not tied to retained evidence | Reviewers cannot reproduce source selection | Retain canonical workflow, exact artifact name, numeric run/artifact IDs, trusted event, timestamps, and extracted paths |

## Data minimization

The retrieval manifest must not retain:

- authorization headers or tokens;
- cookies;
- raw GitHub API responses;
- artifact download URLs;
- arbitrary workflow titles;
- arbitrary exception messages;
- repository secrets or provider configuration values;
- source archive bytes.

The manifest may retain only:

- canonical repository and target SHA;
- fixed workflow file names;
- fixed artifact names derived from the SHA;
- fixed evidence paths;
- numeric run and artifact IDs;
- `push` or `workflow_dispatch` event enum;
- normalized timestamps;
- bounded failure codes;
- completion/blocker status.

## Residual risks

- A compromised GitHub organization administrator may alter workflows or repository policy before evidence generation.
- A passing source artifact can still contain a logic defect in its producer or validator.
- GitHub-hosted runner and artifact service integrity remain provider dependencies.
- External legal, customer, certification, and pentest evidence cannot be created by this closeout pipeline.

These residual risks are not converted into passing claims. The final closeout only proves that the canonical exact-SHA evidence chain satisfied the repository-defined validators at the recorded time.
