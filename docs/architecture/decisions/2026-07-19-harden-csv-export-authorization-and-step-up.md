# Harden CSV export authorization and step-up

## Status

Proposed

## Context

The five report CSV routes were inconsistent security boundaries. Documents and
vendors checked `export_data` and the paid CSV entitlement, while tasks, risks and
the executive report accepted any authenticated organization member. None required
the centralized single-use step-up token, and ordinary links could not attach one.

## Decision

Every report CSV route requires, in order: authenticated organization context,
tenant-scoped `export_data`, the CSV entitlement, a signed/scoped/expiring/single-use
step-up token, distributed export rate limiting, an organization-filtered query and
a durable audit event. The dashboard challenges through the existing MFA or
enterprise IdP flow and downloads with `x-eurocomply-step-up-token` via same-origin
fetch. The scanner prohibits direct CSV links and incomplete route boundaries.

## Consequences

Basic members cannot export by knowing the URL. Paid access and sensitive-action
policy are consistent across all five reports, and successful audits record safe
verification metadata. Production MFA/IdP setup and live AAL2 remain separate
runtime evidence and are not claimed by this repository change.

## Rollback

Revert the routes, client, scanner, tests, rollout matrix and ADR together. No
migration, provider setting, secret or data rewrite is involved. Rollback reopens
the authorization and step-up gap and requires an explicit security decision.
