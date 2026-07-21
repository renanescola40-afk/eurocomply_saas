# Enterprise Release Decision Evidence Contract

## Purpose

This contract defines the only repository-generated Go/No-Go decision for an enterprise release candidate. It consolidates independently produced control evidence without converting implementation presence into runtime proof.

## Required invariants

A control is `Complete` only when its canonical JSON evidence:

- exists at the manifest path;
- records a passing outcome;
- identifies the exact full 40-character release commit SHA;
- identifies the assessed release branch;
- contains a valid timestamp within the configured freshness window;
- contains no secret-bearing keys or credential material;
- includes independent reviewer identity and review timestamp when the manifest requires independent review.

A release is `Go` only when every required control is `Complete`. Missing, stale, malformed, branch-mismatched, SHA-mismatched or sensitive evidence is fail-closed and produces `No-Go`.

## Canonical inputs

- Manifest: `docs/security/evidence/enterprise-release-evidence-manifest.json`
- Runtime evidence: `docs/security/evidence/runtime/*.json`
- Release SHA: workflow input and exact checked-out `main` SHA

## Canonical outputs

- `artifacts/enterprise-release-decision.json`
- `artifacts/enterprise-release-decision.md`

The JSON output contains only control identifiers, names, status, blocking reason codes and SHA-256 digests of source evidence. It does not copy source evidence payloads.

## Truth boundary

The decision builder verifies evidence shape, provenance, freshness, branch/SHA binding, redaction and completeness. It does not independently prove that a provider action occurred, that legal conclusions are correct, that a penetration test was sufficient, or that customer data is accurate.

Runtime workflows and independent reviewers remain responsible for the truth of their bounded evidence. A passing aggregator result is an acceptance decision over those evidence contracts, not a certification or guarantee of compliance.
