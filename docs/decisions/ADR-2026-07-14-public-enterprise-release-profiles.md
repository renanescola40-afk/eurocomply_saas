# ADR: Separate public-production and enterprise release profiles

- Status: Proposed
- Date: 2026-07-14
- Owners: Engineering / Release Management
- Decision type: Release architecture and evidence policy

## Context

The canonical `release:production-final` command invoked `scripts/release/run-public-production-release.mjs`, which unconditionally imported the enterprise environment preflight and enterprise production runner. The downstream runner defaulted `RELEASE_TARGET` to `enterprise`, set `RISCK_COMPLY_ENTERPRISE_RELEASE=true`, required enterprise runtime evidence, and labelled the resulting bundle as an enterprise production gate.

The manual public-production workflow supplied `RELEASE_TARGET=public-production`, but the runner still enabled enterprise-only behavior internally. This coupled public launch validation to enterprise provider configuration and evidence that are not required to prove the public SaaS release is safe.

This repository evidence does not prove a production launch was blocked in practice. It proves that the public and enterprise release contracts were not cleanly separated in source.

## Decision

Use an explicit dispatcher with two fail-closed profiles:

1. **Public production**
   - target: `public-production` or `production`;
   - dedicated environment preflight;
   - deterministic install, lint, typecheck, unit tests, build, E2E, security CI;
   - live Supabase RLS evidence;
   - deployment and observability smoke;
   - rollback dry run;
   - branch-protection, release evidence, approval, go/no-go, incident, support, operations, and strict P0 runtime-gap gates;
   - no enterprise runtime-evidence bundle;
   - no external review or pentest evidence requirement;
   - no enterprise Sentry source-map credential requirement;
   - no enterprise malware-scanner transport requirement.

2. **Enterprise production**
   - target: `enterprise` or explicit enterprise release flag;
   - existing enterprise preflight and enterprise final runner;
   - enterprise runtime evidence and enterprise-only provider controls remain mandatory.

Unknown release targets fail before running either profile.

## Rationale

The split preserves the public launch safety baseline while preventing enterprise procurement controls from becoming an accidental revenue-release dependency. It also makes evidence semantics truthful: a public evidence bundle is labelled public, and an enterprise bundle is labelled enterprise.

## Alternatives considered

### Keep one enterprise runner for every production release

Rejected because it conflates two different acceptance policies and can require controls unrelated to the public launch decision.

### Remove live RLS or other P0 runtime evidence from the public profile

Rejected. Tenant isolation, deployment smoke, observability smoke, rollback, and release go/no-go remain public-production requirements.

### Add flags throughout the existing enterprise runner

Rejected for this change because conditionalizing every enterprise command and evidence field inside one large runner would increase branching and regression risk. Explicit runners are easier to review and rollback. Shared utilities can be extracted later only after both profiles stabilize and proven duplication justifies it.

## Consequences

### Positive

- Public release validation no longer depends on enterprise-only evidence.
- Enterprise validation remains strict and unchanged.
- Release artifacts state their real profile.
- Unknown targets fail closed.
- The public workflow no longer injects enterprise-only Sentry upload credentials.

### Trade-offs

- The public and enterprise runners duplicate some orchestration logic.
- Two profiles require contract tests to prevent drift.
- A future refactor may extract stable shared orchestration primitives, but not at the cost of making policy differences implicit again.

## Security and compliance impact

No authentication, authorization, RLS policy, tenant data, billing behavior, secret value, or production configuration is changed. Public launch still requires live tenant-isolation evidence and security gates. The decision does not claim compliance, certification, external audit, or pentest completion.

## Validation

Repository contract tests verify profile dispatch, required public P0 controls, excluded enterprise-only controls, workflow credentials/artifacts, and preservation of the enterprise runner.

Runtime validation remains unavailable until the workflows run with configured production secrets and target environments.

> Measurement unavailable in the current execution environment.

## Rollback

Revert the commits in the pull request. The original wrapper will again route all production-final executions through the enterprise preflight and runner. No schema, data, secret, provider, or infrastructure rollback is required.
