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
## 2026-11-13 TRU-04 claim-control addendum (review only)

This addendum reconciles the original 2026-07-06 commercial positioning with source currently inspected on GitHub \`main@b9ac6d2b8fff69ea3e5084b3324ab99a0f39b66e\`. It is **not** a fresh Production/exact-release runtime assessment, legal opinion, certification, or customer-specific AI Act classification. Later changes require a fresh evidence binding.

| Customer-facing claim family | Safe evidence-bounded wording | Source of truth / outstanding proof | Decision |
| --- | --- | --- | --- |
| AI governance | Helps teams document AI inventories, risk visibility, governance steps and evidence | \`src/lib/trust-center/content.ts\`; actual plan/module availability requires exact-release tests | ALLOWED_WITH_SCOPE |
| High-risk classification | Assists risk-category screening; customer/legal assessment remains use-, role- and system-specific | \`docs/legal-review-preparation/legal-pack/EU_AI_ACT_GDPR_APPLICABILITY_MATRIX_V7_REVIEW_DRAFT.md\` | NO_AUTOMATIC_LEGAL_DETERMINATION |
| FRIA / Annex IV / Article 50 | Describes review/documentation workflows **only where the specific feature is deployed, usable and evidenced** | Real authenticated QA/browser tests and release SHA required; do not infer runtime health from source files | PENDING_RUNTIME_ATTRIBUTION |
| AI Act timing | Main Article 50 transparency provisions apply from 2 Aug 2026; narrow Article 50(2) pre-existing synthetic-content transition ends 2 Dec 2026; Annex III high-risk duties under amended Article 113 apply from 2 Dec 2027; Annex I high-risk duties from 2 Aug 2028 | Regulation (EU) 2024/1689, as amended by Regulation (EU) 2026/1744; official consolidated Article 113 and European Commission AI Act Service Desk | VERIFIED_LEGAL_SOURCE / APPLICATION_FACT_DEPENDENT |
| AI Act outcomes | No official certification, CE marking, regulator approval, notified-body opinion or guaranteed compliance is offered by this software | \`src/app/[locale]/terms/page.tsx\`, Trust Center prohibited claims and current legal authority | NO_GUARANTEES |
| Security assurance | An attributable third-party black-box assessment dated 12 Sep 2026 is referenced internally; clean independent retest/terminal coverage remains unproven | \`docs/trust/ENTERPRISE_PROCUREMENT_PACKET.md\` and confidential underlying evidence; release coverage is scoped | EVIDENCE_BOUND / NO_CLEAN_PENTEST_CLAIM |
| Certifications | Do not claim ISO 27001 or SOC 2 certification or a completed independent human pentest | Trust Center source restrictions; no independently verified certificate or terminal report in this lane | NOT_CLAIMED |

**Authoritative date anchors:** https://eur-lex.europa.eu/eli/reg/2024/1689 and https://eur-lex.europa.eu/eli/reg/2026/1744/oj and https://ai-act-service-desk.ec.europa.eu/en/ai-act/eu-ai-act-implementation-timeline .

**Public review surfaces inspected in source:** \`src/app/[locale]/terms/page.tsx\`, \`src/app/[locale]/privacy/page.tsx\` and \`src/app/[locale]/dpa/page.tsx\`. They explicitly identify themselves as **review drafts**, not effective final agreements; no public-copy or runtime modifications were made in this addendum. \`src/lib/trust-center/content.ts\` prohibits guarantees and unsupported certification claims. The canonical procurement pack distinguishes a completed bounded assessment from a clean independent retest.

**Next review:** a qualified reviewer must confirm any material contested AI Act interpretation and approve customer claims against the *actually deployed* feature/release evidence. \`TRU-04 = CLAIM_POLICY_RECONCILED / FORMAL_ACCEPTANCE_PENDING\`; \`A-24 = NOT_ACCEPTED\`. This addendum alone cannot increase formal gate/control acceptance.
