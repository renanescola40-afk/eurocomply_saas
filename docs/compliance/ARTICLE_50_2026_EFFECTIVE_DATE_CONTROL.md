# Article 50 — 2026 legally verified effective-date control

## Current legal status (verified 10 November 2026)

Regulation (EU) 2026/1744 was published in the Official Journal on **24 July 2026** and entered into force on **27 July 2026**. It is not merely an AI Omnibus proposal. Under the amended Regulation (EU) 2024/1689, **Article 50 transparency obligations generally apply from 2 August 2026**.

Amended **Article 111(4)** provides a **2 December 2026** deadline solely for the **Article 50(2)** obligations of **providers of AI systems generating synthetic audio, image, video or text content that were placed on the market before 2 August 2026**. Merely putting a system into service is **not** an alternative qualifying condition stated in Article 111(4). This deadline is **not a general postponement** of Article 50 and must **not** be applied to Article 50(4) deployer disclosure duties.

Article 113 also sets separate high-risk AI application dates: **2 December 2027** for the applicable Article 6(2)/Annex III provisions and **2 August 2028** for the applicable Article 6(1)/Annex I provisions, subject to statutory exclusions and other transitional rules. These dates must not be conflated with Article 50.

## Official sources and scope

- [Official Journal — Regulation (EU) 2026/1744](https://eur-lex.europa.eu/eli/reg/2026/1744/oj?locale=en): Article 111(4) and Article 113 amendments.
- [European Commission AI Act Service Desk — Article 111](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-111): consolidated statutory wording and pre-existing-provider transition.
- [European Commission AI Act Service Desk — Article 113](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-113): amended application dates.
- [Regulation (EU) 2024/1689](https://eur-lex.europa.eu/eli/reg/2024/1689/oj?locale=en): base AI Act, to be read as amended.
- Commission Article 50 guidance is implementation guidance; voluntary codes and FAQs alone do not constitute the amending law.

## Product controls — evidence remains per-assessment

The source resolver `src/server/ai-governance/article-50-effective-dates.ts` and customer view `src/lib/article-50-deadlines.ts` preserve a fail-closed rule. Although the amendment is in force, an individual system does **not** automatically receive transitional treatment: the workflow requires the relevant qualifying facts and retained Official Journal verification before it displays the extended deadline. The internal compatibility state `proposal_not_effective` denotes **missing per-assessment evidence**, not that the 2026 amendment remains a legislative proposal.

The active source dashboard `src/app/[locale]/dashboard/transparencia/page.tsx` uses `Article50Workspace`, which calls `getArticle50DeadlineView` and sends assessments through the protected Article 50 API. This is **source-level integration only**; actual customer-facing Production behavior, exact deployment SHA, authenticated E2E and qualified legal acceptance require separate evidence.

The date resolver has these safeguards:

1. general base date remains 2026-08-02;
2. the transition is restricted to qualifying **providers**, Article 50(2) and qualifying pre-existing synthetic-content systems;
3. per-assessment Official Journal evidence remains mandatory before the extended date is applied;
4. Article 50(4) deployer duties never inherit that transition;
5. applicability, legal role, dates and source references remain reviewable and evidence-bound.

## Acceptance boundary

This update corrects legislative source references, wording and customer-facing copy. It is **not legal advice**, a qualified legal opinion, customer-specific legal acceptance, CI PASS, Production verification or an Enterprise TRU-04 PASS. Record approval and live evidence through the existing formal gate process only.
