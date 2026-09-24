# RISCK COMPLY — Enterprise Architecture Diagram

Status: buyer-review architecture summary. This diagram describes repository-evidenced logical boundaries; it is not a network certification, provider attestation or guarantee that every optional provider is enabled for every customer.

```mermaid
flowchart TB
  Buyer[Buyer / anonymous visitor] --> Public[Public Next.js surfaces\nLanding · Pricing · Trust · Security · Procurement]
  User[Authenticated organization user] --> Edge[Next.js middleware / session boundary]
  Edge --> App[Next.js App Router\nPages · Route handlers · Server actions]
  Public --> App

  App --> Auth[Supabase Auth]
  App --> RBAC[Server-side organization membership + RBAC]
  RBAC --> DB[(Supabase Postgres)]
  DB --> RLS[Forced RLS / tenant-scoped policies]
  App --> Storage[Supabase Storage\ncontrolled document/evidence storage]
  App --> Audit[Audit / evidence events]

  App --> Billing[Stripe server-side billing]
  Stripe[Stripe] -->|signed webhooks| Billing
  Billing --> DB

  App -. optional / configured .-> Ops[Operational providers\nemail · monitoring · analytics · rate limiting]
  CI[GitHub CI / security / release gates] --> App
  CI --> Evidence[Release and assurance evidence]
```

## Trust boundaries

1. **Anonymous/public boundary** — only public marketing, pricing, Trust Center and buyer-safe procurement metadata are intended to be exposed.
2. **Authentication boundary** — private organization routes require a Supabase-authenticated session.
3. **Authorization boundary** — server-side organization membership and permission checks protect sensitive operations.
4. **Database tenant boundary** — organization-scoped Postgres access is backed by RLS policies; privileged service-role operations remain server-only.
5. **Storage boundary** — controlled uploads/evidence use server-side authorization and private-storage controls where configured.
6. **Billing boundary** — the browser does not authorize plan entitlements or raw payment state; server-side billing logic and signed Stripe webhook events provide provider authority.
7. **Provider boundary** — optional/conditional providers are disclosed in the subprocessor/provider register with evidence-specific region and contract boundaries.
8. **Release boundary** — CI/security/release gates provide repository/runtime evidence; they do not substitute for third-party certification.

## Buyer review references

- `docs/trust/ARCHITECTURE_OVERVIEW.md`
- `docs/trust/ACCESS_CONTROL.md`
- `docs/trust/SECURITY_OVERVIEW.md`
- `docs/trust/DATA_PROTECTION.md`
- `docs/trust/SUBPROCESSORS.md`
- `docs/legal-assurance/INTERNATIONAL_TRANSFER_REGISTER.md`
- `docs/trust/PROCUREMENT_LEGAL_PRIVACY_CLOSURE_2026-09-24.md`
