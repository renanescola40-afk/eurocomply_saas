# RISCK COMPLY — Organic Discovery Baseline

Date: 2026-09-13  
Mode: SEO + GEO + AEO + LLM discovery baseline  
Repository baseline: `4e8a4272fc1f6a334d87aeac8db065db10955c40`  
Primary domain: `https://www.risckcomply.com`

## Executive state

RISCK COMPLY already has a strong technical SEO foundation for an early-stage B2B SaaS: localized public routes, explicit canonicals, hreflang authority, robots protection for private/authenticated routes, an XML sitemap, structured data, feature landing pages and several genuinely useful public tools.

The current constraint is no longer "basic SEO missing". The larger gap is category authority: broad commercial searches for EU AI Act compliance software and AI governance are currently occupied by established category guides, specialist vendors and enterprise suites. RISCK COMPLY needs deeper authoritative content, stronger public research/tool distribution, better discovery of existing assets and external authority signals.

A live search spot-check on 2026-09-13 found RISCK COMPLY indexed for branded/product pages, including the English homepage, About, Pricing, Trust/Security and localized feature pages. The same spot-check did not surface RISCK COMPLY among the leading results for the broad query family `EU AI Act compliance software`, where comparison publishers and specialist vendors currently dominate.

## Evidence-bound scorecard

These are implementation/readiness scores, not guaranteed rankings.

| Area | Score | Notes |
| --- | ---: | --- |
| Technical SEO | 80/100 | Strong metadata, sitemap, robots, locale/canonical foundation; some live growth assets were not surfaced in sitemap/hub at baseline. |
| GEO readiness | 46/100 | Crawlable factual product content exists, but citation-worthy original research and regulation-specific authority coverage are still limited. |
| AEO readiness | 50/100 | Feature FAQs and free tools are strong primitives; direct-answer regulatory clusters need expansion. |
| Entity authority | 60/100 | Organization/software structured data and consistent brand surfaces exist; external corroborating authority is still thin. |
| Content authority | 52/100 | Eight localized feature families plus public assurance pages exist; EU AI Act knowledge-cluster depth is not yet category-leading. |
| Overall organic discovery | 62/100 | Good technical base, material authority/distribution gap. |

Weighted master score using the Discovery Executor model:

- Technical SEO: 16/20
- Content quality: 10/15
- Topical authority: 7/15
- International SEO: 8/10
- Entity authority: 6/10
- Structured data: 4/5
- Performance: 3/5 (not fully re-benchmarked in this lane)
- Internal linking: 3/5
- Backlink authority: 1/5 (no connected backlink dataset; conservative default)
- AEO/GEO/LLM discovery: 4/10

**Total: 62/100**

## Baseline architecture discovered

### Technical authority already present

- `src/app/robots.ts` blocks API/authenticated/private route families from generic crawlers and advertises the canonical sitemap.
- `src/app/sitemap.ts` publishes localized acquisition routes, English assurance/growth routes and all localized feature pages.
- public metadata uses explicit canonical/hreflang patterns.
- `SoftwareApplication`, Organization/WebSite/WebPage and feature-specific structured data are already implemented in the codebase.
- international SEO has regression coverage.
- authenticated/customer-specific surfaces are intentionally excluded from public indexing.

### Indexable route footprint at baseline

Based on current sitemap construction and six supported locales:

- core acquisition/assurance entries: 21
- English growth entries before this slice: 3
- localized feature entries: 48 (8 feature families × 6 locales)
- total sitemap entries before this slice: 72

This slice adds three already-live English free-tool routes to the growth sitemap, taking the modeled total to 75.

### Existing feature families

1. AI inventory
2. AI risk assessment
3. Evidence management
4. AI governance workflows
5. Vendor AI risk
6. EU AI Act readiness
7. Audit trails
8. Compliance documentation

### Existing free tools

1. EU AI Act Readiness Assessment
2. Article 50 Transparency Checker
3. Provider vs Deployer Checker
4. AI Governance Maturity Assessment

At baseline, the first tool was discoverable from `/en/tools`, while the other three had complete live routes/metadata but were still represented as `Planned` on the hub and omitted from the sitemap. That is the first repository-controlled discovery defect addressed by this program.

## Current release/search boundary

`main` at baseline is `4e8a4272fc1f6a334d87aeac8db065db10955c40`.

The connected Vercel deployment inventory shows recent READY previews but does not independently prove that this exact `main` SHA is the canonical `www.risckcomply.com` production deployment. Therefore:

`CURRENT_MAIN_SHA=4e8a4272fc1f6a334d87aeac8db065db10955c40`

`CURRENT_PRODUCTION_SHA=NOT_PROVEN_IN_THIS_LANE`

`EXACT_SHA_PRODUCTION=OPEN`

No discovery lane may convert that state to PASS from a healthy public page alone.

## Top 20 blockers

1. Broad commercial category queries do not yet visibly surface RISCK COMPLY among leading results in spot checks.
2. Three complete free tools were not surfaced from the tools hub at baseline.
3. Those three complete free tools were absent from the sitemap at baseline.
4. No comprehensive EU AI Act authority hub was identified at baseline.
5. No article-by-article AI Act knowledge architecture is yet category-complete.
6. No strong original research/benchmark asset is yet established as a citation magnet.
7. External backlink/referring-domain authority has not been established in this lane.
8. No connected Google Search Console dataset is available to this executor, so impressions/clicks/query positions cannot yet be treated as measured facts.
9. No connected Bing Webmaster dataset is available to this executor.
10. AI-engine citation share has not yet been systematically benchmarked across a fixed query set.
11. Commercial landing pages are concentrated in feature families rather than dedicated high-intent category/use-case families.
12. Industry-specific AI governance pages are not yet comprehensive.
13. Procurement and enterprise-governance thought leadership can be expanded beyond product/trust surfaces.
14. English growth assets are stronger than non-English growth/resource coverage; current noindex behavior is safe but leaves multilingual demand uncaptured.
15. Comparison/category pages are not yet a mature acquisition channel.
16. Entity authority outside first-party surfaces needs stronger corroboration.
17. Trust/search copy in production can lag repository truth until a governed exact-SHA deployment occurs.
18. Structured data is strong but needs ongoing visible-content parity as commercial pages evolve.
19. Content update provenance should be tied to meaningful regulatory/content revisions rather than cosmetic freshness.
20. The site needs a repeatable measurement loop that separates branded discovery from non-branded category acquisition.

## Top 50 target queries

### High-intent commercial/category

1. EU AI Act compliance software
2. AI governance platform Europe
3. AI governance software
4. EU AI Act software
5. AI Act compliance platform
6. AI compliance software
7. AI risk management platform
8. AI risk management software Europe
9. AI inventory software
10. AI inventory software EU
11. enterprise AI governance platform
12. AI governance tool
13. AI compliance management platform
14. AI governance system of record
15. AI governance automation
16. AI vendor risk management software
17. AI compliance documentation software
18. AI audit trail software
19. AI governance workflow software
20. EU AI Act readiness platform
21. AI Act risk classification software
22. AI Act documentation platform
23. AI governance platform for banks
24. AI governance software for insurance
25. AI governance software for fintech

### Informational / AEO / GEO

26. what is the EU AI Act
27. who does the EU AI Act apply to
28. does the EU AI Act apply outside Europe
29. EU AI Act provider vs deployer
30. AI Act provider definition
31. AI Act deployer definition
32. EU AI Act Article 50 transparency requirements
33. Article 50 AI Act checker
34. EU AI Act prohibited practices Article 5
35. what is high-risk AI under the EU AI Act
36. EU AI Act high-risk classification
37. EU AI Act risk categories
38. AI inventory template
39. how to create an AI inventory
40. AI governance maturity assessment
41. AI governance maturity model
42. AI governance framework for enterprises
43. EU AI Act compliance checklist
44. EU AI Act implementation checklist
45. FRIA EU AI Act checklist
46. fundamental rights impact assessment AI Act
47. AI vendor due diligence checklist
48. AI procurement governance checklist
49. AI governance for compliance teams
50. how to prepare for EU AI Act compliance

## Top 25 commercial queries

The commercial subset is queries 1–25 above. Prioritize pages where RISCK COMPLY has genuine product evidence rather than manufacturing thin keyword variants.

## Top 25 informational queries

The informational subset is queries 26–50 above. Prioritize primary-source citations, concise answer blocks, examples, decision trees and links into relevant product workflows.

## Top 10 AI-engine benchmark queries

Use the same wording on each benchmark date and record whether RISCK COMPLY is mentioned/cited:

1. What are the best EU AI Act compliance software platforms?
2. What are the best AI governance platforms for European companies?
3. Which software can help create an AI inventory for the EU AI Act?
4. What software helps enterprises prepare EU AI Act evidence?
5. What are the best AI governance tools for banks in Europe?
6. How should a company determine whether it is an AI provider or deployer?
7. What are the Article 50 transparency obligations under the EU AI Act?
8. How do I assess AI governance maturity?
9. What should an enterprise AI governance operating model include?
10. Which platforms combine AI inventory, risk, evidence and governance workflows?

## Top 10 competitor/content gaps to attack

1. Operational AI governance evidence, not just regulatory summaries.
2. Provider/deployer factual role mapping with explicit uncertainty routing.
3. Article 50 operational scenario tooling.
4. Enterprise AI governance maturity benchmarking.
5. AI inventory ownership/evidence workflows for lean enterprise teams.
6. Procurement-oriented AI governance readiness.
7. Vendor AI risk integrated with AI inventory and evidence.
8. Bank/insurance-specific governance operating models.
9. Evidence-bound comparisons that distinguish public claims from verified product capabilities.
10. Original EU AI governance research based on transparent methodology rather than fabricated survey data.

## 90-day roadmap

### Days 1–15 — discovery hygiene + asset exposure

- surface all live free tools from `/en/tools`;
- publish all live tools in sitemap;
- lock canonical/noindex behavior with tests;
- inventory all public routes and verify indexing intent;
- verify current sitemap/robots in the final exact-SHA release;
- create a fixed search/AI-engine benchmark query set;
- connect measured search data when Search Console/Bing data becomes available.

### Days 16–35 — category landing pages

Build a bounded set of differentiated, evidence-based commercial pages such as:

- `/en/ai-governance-platform`
- `/en/eu-ai-act-compliance-software`
- `/en/ai-inventory-software`
- `/en/ai-governance-for-banks`
- `/en/ai-governance-for-insurance`

Do not publish if the page would merely restate another route.

### Days 36–60 — EU AI Act authority hub

Create source-grounded clusters for:

- roles and scope;
- Article 5 prohibited practices;
- high-risk classification;
- FRIA;
- transparency / Article 50;
- inventory and accountability;
- governance evidence;
- implementation timelines.

Every article should include primary sources, author/reviewer provenance, meaningful update dates and a product-adjacent CTA only where relevant.

### Days 61–75 — citation magnets

Prioritize original, transparent assets:

- EU AI governance maturity model;
- AI inventory template;
- AI vendor due-diligence checklist;
- procurement governance checklist;
- evidence/control mapping reference;
- methodology-backed readiness benchmark.

### Days 76–90 — authority/distribution

- legitimate digital PR around original assets;
- marketplace/directory presence where factual and relevant;
- expert/journalist outreach;
- benchmark search/AI citations again;
- refresh internal linking around pages receiving impressions but weak clicks/rankings;
- expand winning clusters instead of mass-producing pages.

## First implementation slice

Branch: `growth/organic-discovery-tools-baseline-20260913`

Scope:

- add all complete English free tools to the growth sitemap;
- convert the `/en/tools` hub from one live tool + three stale `Planned` cards into four actual crawlable internal links;
- update discovery metadata to accurately describe the live tool set;
- expand regression coverage so hidden/orphaned live-tool drift cannot silently return;
- create this evidence-bound baseline.

No Production deployment is requested from this slice. It must pass the repository's normal protected checks and must not bypass exact-SHA/security/release governance.

## Current program percentages

`SEO_PERCENT=62`

`GEO_AEO_PERCENT=48`

`CONTENT_AUTHORITY_PERCENT=52`

`TECHNICAL_PERCENT=80`

`ENTITY_AUTHORITY_PERCENT=60`

These values are baselines for prioritization, not claims of Google rank or AI-engine citation probability.
