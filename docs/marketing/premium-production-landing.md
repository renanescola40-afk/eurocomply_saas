# RISCK COMPLY premium production landing

## Purpose

This document defines the production contract for the public RISCK COMPLY landing experience introduced by the premium marketing Mega PR.

## Ten integrated workstreams

1. Remove countdown, fixed launch date and dominant waitlist gating from the public homepage.
2. Restore localized login, signup and pricing conversion routes.
3. Deliver a premium dark navy, teal and green hero with optional video delivery and a graceful static fallback.
4. Demonstrate implemented product capabilities through an in-browser product preview rather than unsupported screenshots or claims.
5. Present implemented capabilities in a reduced-motion-safe right-to-left marquee.
6. Add product, workflow, security and final conversion sections with Portugal Portuguese copy.
7. Keep public claims bounded: no guaranteed compliance, legal replacement, certification or unsupported audit claims.
8. Harden public navigation and mobile behavior without breaking locale routing.
9. Expand Playwright coverage for landing, pricing, authentication CTAs, onboarding and critical journeys.
10. Align route-health, Next.js configuration and security-suite contracts so the public experience can pass release gates.

## Public routes

- `/{locale}`
- `/{locale}/login`
- `/{locale}/signup`
- `/{locale}/pricing`

No public CTA may point to a non-existent route.

## Optional hero media

The page supports these optional files:

- `/public/marketing/risck-comply-enterprise-hero.webm`
- `/public/marketing/risck-comply-enterprise-hero.mp4`

The landing must remain visually complete when neither file is present. Motion must never be required to understand the product or reach a conversion route.

## Accessibility contract

- keyboard-reachable navigation and CTAs;
- visible focus states;
- reduced-motion support;
- no horizontal overflow at mobile or desktop breakpoints;
- meaningful headings and link names;
- decorative motion hidden from repeated assistive-technology announcement.

## Truth boundary

The public page may describe only capabilities evidenced in the repository, including AI inventory, structured assessments, evidence and document workflows, ownership, tasks, organization workspaces, role-based access and activity history.

RISCK COMPLY supports governance and evidence preparation. It does not replace legal counsel and does not guarantee regulatory outcomes.

## Release validation

Before merge, the branch must pass the repository-required checks, including lint, typecheck, unit tests, applicable E2E tests, production build, route quality, security suites and enterprise release gates.
