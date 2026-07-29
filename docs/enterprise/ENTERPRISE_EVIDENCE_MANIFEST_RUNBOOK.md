# Enterprise Evidence Manifest Runbook

## Purpose

Assemble the repository's distributed runtime evidence into one deterministic, sanitized and exact-SHA manifest that can be consumed by the canonical scorecard promotion engine.

## Why this gate exists

A merged implementation, a green advisory check or a stale artifact does not prove that an enterprise control passed on the integrated release candidate. The manifest is the provenance boundary between runtime evidence production and scorecard promotion.

## Accepted evidence

Every accepted JSON document must declare:

- a stable `evidenceItem`;
- identical `targetSha` and `observedSha` matching the requested integrated SHA;
- `status: Complete` and `outcome: passed`;
- a valid `generatedAt` timestamp;
- repository and GitHub run provenance;
- one or more canonical control IDs in `controlsVerified`;
- `evidenceIntegrity.containsSensitiveValues: false`.

Both `runId` and the existing `githubRunId` field are normalized to the manifest's `runId` contract.

## Fail-closed rules

The builder rejects malformed JSON, oversized files, SHA mismatch, missing provenance, incomplete results, empty control references, sensitive-shaped fields and duplicate evidence item/run identities. It limits traversal to 500 JSON files and 2 MiB per file.

The workflow returns `NO_GO` when any artifact is rejected or when no valid evidence is found. It must not be converted to advisory merely to obtain a green check.

## Output

`artifacts/enterprise-readiness/evidence-manifest.json` contains only bounded metadata, normalized control references, source-relative paths, source SHA-256 digests, rejected-item reasons and a deterministic manifest digest. It must not contain raw provider responses, credentials, cookies, customer data, database URLs, signed URLs or private keys.

## Execution

1. Collect sanitized evidence artifacts for the exact integrated `main` SHA into the configured input directory.
2. Dispatch **Enterprise evidence manifest** with the exact 40-character SHA.
3. Review all rejected items.
4. Do not run scorecard promotion until the manifest decision is `READY_FOR_PROMOTION`.
5. Feed the retained manifest artifact into **Enterprise scorecard promotion** for the same SHA.

## Rollback

Revert the workflow, builder, tests and this runbook. No database or production state is mutated. Historical retained artifacts remain immutable records.

## Progress boundary

This package creates the missing bridge between runtime artifacts and the canonical scorecard, but it does not itself prove any runtime control. The last accepted baseline remains **45% complete / 55% remaining** until accepted evidence is assembled and promoted on the integrated `main` SHA.
