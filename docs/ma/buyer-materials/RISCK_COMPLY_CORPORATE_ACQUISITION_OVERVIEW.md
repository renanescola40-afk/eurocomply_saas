# RISCK COMPLY — Corporate Acquisition Overview

Date: 2026-10-07
Positioning: completed pre-commercial technology asset / strategic build-vs-buy opportunity

## Product summary

RISCK COMPLY is an enterprise-oriented AI governance and compliance platform built around AI-system inventory, regulatory risk classification, governance evidence, documentation, auditability, monitoring and EU AI Act readiness.

The transaction thesis is technology/IP acquisition and strategic integration, not acquisition of an established ARR base.

## Problem solved

Organizations deploying AI need a repeatable way to identify systems, assign ownership, classify regulatory and governance risk, document controls, preserve evidence, support procurement and maintain an auditable lifecycle. RISCK COMPLY centralizes those workflows.

## Core product modules

- AI system inventory and ownership context
- AI risk / regulatory classification and reassessment
- Governance workflows and evidence records
- Compliance/document generation
- Audit trail and evidence export
- Procurement/vendor governance surfaces
- Monitoring and regulatory-update workflows
- Organization/workspace role controls
- Billing/entitlement infrastructure
- Trust, security and procurement evidence surfaces

## EU AI Act and AI-governance scope

The repository contains product and governance work covering AI inventory, prohibited-practice screening, high-risk governance, transparency obligations, technical-documentation support, FRIA-related workflow boundaries, post-market/incident governance and third-party/GPAI governance where supported.

These capabilities support customer governance work; RISCK COMPLY does not itself constitute legal advice, regulatory approval or certification.

## Enterprise architecture

Current documented architecture uses Next.js/TypeScript with Supabase authentication and Postgres, organization-aware authorization, forced RLS tenant boundaries, Stripe billing infrastructure, audit/evidence controls and CI/security/release gates. Provider-specific facts remain governed by the canonical trust and provider evidence registers.

## Security model

Implemented and documented controls include RBAC, RLS/tenant isolation, BOLA/IDOR-oriented authorization controls, fail-closed data-access patterns, audit/event evidence, branch/release security gates, SBOM/OSS evidence and security documentation.

No SOC 2 or ISO 27001 certification is claimed. A clean independent terminal pentest/retest is not currently credited as complete.

## Multi-tenancy and authorization

Tenant separation is designed around organization/workspace context plus database RLS, application authorization and protected server/API boundaries. Buyer diligence should use the current security evidence rather than marketing claims.

## Auditability and evidence generation

The product and repository include audit logging/evidence patterns, exportable governance artifacts, compliance documentation and trust/procurement materials intended to help organizations demonstrate internal AI-governance processes.

## Provider stack

Current material references Vercel, Supabase, Stripe, GitHub, Google, Sentry, Upstash Redis, Resend and PostHog/other configured providers. Transferability is provider-specific and is not represented as blanket account transfer.

## Current commercial status

RISCK COMPLY is pre-commercial / pre-revenue. Stripe LIVE evidence reviewed in the repository showed zero invoices and zero charges for the product at that evidence point. The product was completed before full go-to-market scaling, and the ownership strategy then shifted toward a strategic sale.

No established customer base is claimed.

## Current assurance status

Positive diligence evidence includes SBOM/OSS work, RLS/tenant-isolation evidence, RBAC/governance evidence, DR/recovery materials, billing/provider evidence and extensive internal enterprise/security documentation.

Current disclosed limits include:
- current main and latest READY production SHA are not equal;
- Vercel resource creation is blocked by an overdue-balance/payment action owned by the account owner;
- independent terminal pentest/retest is not credited as PASS;
- provider closing transfers, buyer acceptance and credential rotation are not executed;
- creator-to-seller IP title execution remains open.

## Transaction perimeter

A strategic transaction may include, subject to title/transfer confirmation: source code, repository, software IP, documentation, database/schema artifacts, product brand, domain, design/marketing assets, compliance content, security documentation, deployment configuration, provider handoff and knowledge transfer.

Detailed scope is controlled by the transaction-perimeter document and definitive transaction documents.

## Build-vs-buy rationale

An acquirer is evaluating completed product capability, regulatory-domain work, enterprise-oriented architecture, security/governance implementation, documentation and integration optionality rather than buying historical revenue.

The potential value is avoided build time and integration acceleration. No unsupported build-cost number, market valuation or buyer-accepted price is claimed here.

## Buyer integration options

A buyer could evaluate:
- standalone continuation under the existing brand;
- rebranding into a broader GRC / AI-governance portfolio;
- integration into enterprise trust, risk, compliance or AI-platform products;
- use as an internal control/evidence layer for AI-enabled workflows.

Actual deployment, rebranding and migration timing depends on the acquirer’s architecture, provider accounts, security review and transaction close.
