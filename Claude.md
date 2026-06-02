# Project Structure

## Overview
EuroComply AI is a premium European enterprise SaaS for AI governance, EU AI Act readiness, compliance documentation, AI inventory management, procurement support, recurring monitoring, and subscription billing.

## Tech Stack
- Framework: Next.js 15 App Router
- Language: TypeScript + React 19
- UI: Tailwind CSS 4, shadcn/Radix UI components, lucide-react, custom dark premium visual system
- Charts/analytics: Recharts and custom dashboard UI
- Animation: Framer Motion available
- Database/Auth: Nubase/Supabase client with PostgreSQL tables and RLS
- Payments: Stripe subscription routes using `stripe`
- Notifications: Sonner

## Directory Structure
```text
src/
├── app/
│   ├── page.tsx                         # Premium landing page, auth modal, onboarding
│   ├── dashboard/page.tsx               # Protected SaaS dashboard and modules
│   ├── next_api/stripe/checkout/route.ts
│   ├── next_api/stripe/customer/route.ts
│   ├── next_api/stripe/webhook/route.ts
│   ├── layout.tsx
│   └── globals.css
├── components/
│   └── ui/                              # shadcn/Radix component library
├── hooks/
│   └── useAuth.tsx                      # AuthProvider and useAuth hook
└── integrations/
    └── supabase/
        ├── client.ts                    # Protected generated Supabase client
        ├── server.ts                    # Protected generated admin client
        └── types.ts                     # Minimal typed public schema
```

## Core Systems

### Authentication
- Status: Implemented
- Location: `src/hooks/useAuth.tsx`, `src/app/page.tsx`
- Description: Email/password authentication, Google OAuth popup, session state, logout, and onboarding flow. Do not create `src/middleware.ts` for auth protection.

### Multi-tenant Workspaces
- Status: Implemented and hardened
- Location: Nubase tables `workspaces`, `workspace_members`, `profiles`, `src/app/dashboard/page.tsx`
- Description: Users create a company workspace during onboarding. Dashboard access now resolves the active workspace through `workspace_members` instead of owner-only lookup, stores the current role, and applies role-aware action gating in the UI. Workspace RLS uses membership policies and direct Supabase client calls from the frontend.

### Visual System
- Status: Implemented
- Location: `src/app/globals.css`, `src/app/page.tsx`, `src/app/dashboard/page.tsx`
- Description: Dark-mode-first luxury enterprise UI using deep black, graphite, subtle blue lighting, premium glass surfaces, cinematic dashboard mockups, hover depth, animated borders, and a Linear/Stripe/Vercel-inspired dashboard style.

### Compliance Dashboard
- Status: Implemented
- Location: `src/app/dashboard/page.tsx`
- Description: Protected premium dark dashboard with sidebar navigation, compliance score, AI risk score, AI inventory, assessments, documents, procurement passports, billing status, readiness checklist, and audit logging.

### Continuous Monitoring
- Status: Implemented
- Location: `src/app/dashboard/page.tsx`, Nubase tables `monitoring_preferences`, `regulatory_updates`, `audit_logs`
- Description: Dashboard tab named Monitoramento with EU AI Act tracker, dynamic compliance score calculation, configurable email alert preferences, audit log table, CSV export, and plan gating for basic users.

### AI Inventory
- Status: Implemented
- Location: `src/app/dashboard/page.tsx`, table `ai_tools`
- Description: Users can register AI systems, risk level, purpose, status, and workspace ownership.

### Compliance Documents
- Status: Implemented
- Location: `src/app/dashboard/page.tsx`, table `compliance_documents`
- Description: Users can create policies, assessment reports, and procurement passport documents.

### Billing
- Status: Implemented and hardened
- Location: `src/app/next_api/stripe/*`, `src/app/dashboard/page.tsx`
- Description: Subscription checkout, customer management, and webhook handling for Starter, Growth, and Enterprise plans. Checkout/customer routes require a bearer session token, derive `userId` from the authenticated user, validate workspace membership, and no longer trust client-supplied identity. Webhook processing validates workspace/user metadata before writing subscription and payment records. Required env keys include Stripe secret, webhook secret, app URL, and price IDs.

### Security Hardening
- Status: Implemented
- Location: `next.config.ts`, `src/middleware.ts`, `src/components/Error.tsx`
- Description: Global headers now use same-origin framing, no wildcard CORS, content-type sniffing protection, referrer policy, and restricted browser permissions. The error boundary no longer posts stack traces or URL details to external origins.

### Database Security
- Status: Implemented and hardened
- Location: Nubase schema
- Description: RLS-enabled tables for profiles, workspaces, members, assessments, tools, documents, procurement, audit logs, subscriptions, payments, invoices, monitoring preferences, and regulatory updates. Helper functions now include workspace membership, workspace management, and monitoring entitlement checks. Indexes, uniqueness constraints, plan/risk/role checks, explicit `WITH CHECK` policies, and paid-plan monitoring preference restrictions were added.

## Current State
- [x] Dark premium cinematic landing page for EuroComply AI
- [x] Authentication and onboarding
- [x] Protected dashboard
- [x] AI inventory module
- [x] Assessment and compliance scoring
- [x] Policy/document generation placeholders
- [x] Procurement passport area
- [x] Continuous monitoring section
- [x] Audit logs and CSV export
- [x] Stripe subscription routes with authenticated checkout
- [x] Security headers, safe error boundary, RBAC-aware dashboard access, and hardened RLS
- [x] Minimal Supabase public schema types
- [ ] Production Stripe price IDs and webhook secrets must be configured
- [ ] Real AI document generation and PDF export can be expanded

## Maintenance Log
- 2026-05-28: Implemented EuroComply AI SaaS foundation with landing page, auth, dashboard, Nubase schema, Stripe routes, and continuous monitoring module.
- 2026-05-28: Rebuilt the visual system into a dark premium enterprise template with cinematic landing composition, glass surfaces, tech grid layers, animated borders, and upgraded dashboard styling.
- 2026-05-28: Hardened security posture with safe error handling, restrictive headers, authenticated Stripe checkout/customer routes, validated Stripe webhook writes, membership-based dashboard loading, RBAC-aware actions, paid-plan monitoring enforcement, strengthened RLS policies/functions/indexes, and minimal Supabase schema types.
