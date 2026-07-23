# Qualified Review Operational Workspace

## Purpose

This workspace coordinates the eight qualified legal and methodology reviews that remain after product implementation, CI and runtime evidence are complete.

Customer route: `/{locale}/dashboard/qualified-reviews`

## Governed requirements

1. Legal rules registry.
2. Article 5 prohibited-practices methodology.
3. Article 50 transparency wording.
4. Article 27 FRIA methodology.
5. Deployer obligations.
6. High-risk provider data-governance methodology.
7. Conformity, EU declaration, CE and registration.
8. GPAI applicability and obligations.

## Lifecycle

`DRAFT → ASSIGNED → IN_REVIEW → APPROVED | APPROVED_WITH_LIMITATIONS | REJECTED`

Changes requested return to `IN_REVIEW`. Approved records become `EXPIRED` when their validity window closes or the reviewed SHA changes.

## Required evidence

- exact 40-character reviewed SHA;
- named reviewer and organization;
- safe contact reference;
- title and discipline or jurisdiction;
- redacted qualification evidence references;
- completed conflict-of-interest assessment;
- evidence-package SHA-256 digest;
- substantive decision rationale;
- limitations where applicable;
- review and validity timestamps;
- independent approver.

## Security model

- every record is scoped by `organization_id`;
- RLS is enabled and forced;
- authenticated users have read-only table access;
- writes use server-side service-role operations;
- final transitions use row locks and optimistic concurrency;
- preparer and approver must differ;
- decision history is append-only and written in the same transaction;
- no identity documents, customer data, privileged advice or secrets are stored.

## Promotion

The promotion adapter consumes a sanitized workspace export and only creates accepted evidence in an artifact root when every package:

- belongs to a canonical requirement;
- matches the target SHA;
- has a terminal approved decision;
- contains reviewer identity, qualification and independence evidence;
- is unexpired;
- has a valid evidence digest;
- records limitations when approval is conditional.

Generated files are review candidates. They must still pass the existing Qualified Review Assurance validator and a reviewed pull request before becoming canonical evidence.

## Truth boundary

This workflow proves that a named qualified person reviewed a defined package. It does not certify a customer, guarantee EU AI Act compliance, replace legal counsel, authorize CE marking or represent regulator acceptance.
