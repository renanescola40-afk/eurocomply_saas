# ADR: FRIA Operational Write Boundary

- Status: Accepted for repository implementation
- Date: 2026-07-22

## Context

The repository had a deterministic Article 27 decision engine, a tenant-scoped FRIA schema and a read-only Regulatory Control Tower. Customers could not create, update, evidence or approve a FRIA through the product.

A generic regulatory mutation endpoint was rejected because each workstream has different state rules, approval actors, evidence requirements and compensation behavior.

## Decision

Create a dedicated FRIA API and localized editor.

The API:

- validates AI-system ownership before assessment creation;
- enforces read and manage governance permissions;
- validates bounded input with workflow-specific Zod schemas;
- requires trusted Origin for mutations;
- rate-limits each organization, actor and workflow;
- reloads tenant-owned records before every transition;
- executes `decideFria` server-side for updates and approval;
- requires the authenticated approver to equal the recorded `approver_id`;
- persists a durable audit event for every material write;
- compensates the domain write when audit persistence fails.

## Security consequences

The browser cannot set an assessment to approved directly. Approval is derived from persisted evidence state and the server decision engine.

Cross-tenant AI-system IDs, assessment IDs and storage paths are rejected. The administrative database client remains server-only.

## Product boundary

An approved FRIA record is an accountable workflow state. It is not a legal opinion, regulator approval, DPIA replacement, proof that every affected right was identified or authorization to deploy.

## Follow-up evidence

Before scorecard promotion, validate exact-head CI, isolated migration, two-organization access, audit-outage compensation, storage-path controls, accessibility, localization and qualified legal methodology review.
