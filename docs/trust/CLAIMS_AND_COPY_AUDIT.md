# Claims and Copy Audit

Date: 2026-07-06
Brand: RISCK COMPLY

## Scope

Reviewed customer-facing wording across the public landing experience, pricing plan feature names, dashboard upgrade copy, SEO metadata and Trust Center content.

## Decision

RISCK COMPLY should be positioned as an AI governance readiness and compliance operations platform for European B2B teams.

The approved commercial position is:

> RISCK COMPLY helps teams organize AI inventory, risk visibility, governance workflows and evidence preparation for AI Act readiness.

## Claims policy

Customer-facing copy must not present the product as a certification, audit report, legal guarantee, full compliance guarantee, automatic compliance engine, or replacement for lawyers, DPOs or compliance officers.

Unsupported security or assurance claims must not be used unless there is current evidence that can be shared with customers under the correct process.

## Approved language

Use:

- AI Act readiness support
- governance workflows
- evidence preparation
- risk visibility
- compliance operations support
- trust documentation
- procurement support
- security review support
- customer review support
- helps teams prepare and organize evidence

Always keep this disclaimer available in legal, trust and high-intent purchase surfaces:

> RISCK COMPLY supports organization, workflows and evidence preparation. It does not provide legal advice and does not guarantee compliance outcomes.

## Files changed

- `src/components/marketing/waitlist-page.tsx`
  - Reframed the landing headline around readiness support.
  - Added clear no-legal-advice and no-guarantee positioning.
  - Replaced exaggerated success messages with measured confirmation copy.

- `src/app/[locale]/layout.tsx`
  - Replaced SEO positioning with AI Governance Readiness Platform.
  - Reframed descriptions around readiness support, risk visibility and evidence preparation.

- `src/lib/trust-center/content.ts`
  - Clarified allowed and prohibited trust claims.
  - Removed unsupported assurance wording.
  - Aligned provider wording with the current Supabase-based architecture.

- `src/lib/billing/plans.ts`
  - Replaced plan feature names that implied unsupported readiness with safer operational wording.

- `src/app/[locale]/risck-comply-home/page.tsx`
  - Reframed internal dashboard copy around readiness operations.
  - Added disclaimer that the readiness score is not a legal compliance guarantee.

## Acceptance result

The SaaS now communicates stronger value while reducing legal risk. The product reads as a serious B2B compliance operations tool, not as a certification, legal advice or guarantee product.
