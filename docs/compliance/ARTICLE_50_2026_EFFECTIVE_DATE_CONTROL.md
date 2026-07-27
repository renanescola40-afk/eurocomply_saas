# Article 50 — 2026 effective-date control

## Decision

RISCK COMPLY must treat **2 August 2026** as the binding application date for Article 50 unless a final amending regulation and its entry-into-force provisions have been verified in the Official Journal of the European Union.

The proposed **2 December 2026** transition may only be applied to qualifying systems placed on the market or put into service before 2 August 2026, only for the Article 50(2) marking and detection duties, and only after Official Journal verification.

It must not be applied as a general postponement of Article 50 or to Article 50(4) deployer disclosure duties.

## Official sources verified on 27 July 2026

- Regulation (EU) 2024/1689, Article 113: Article 50 applies from 2 August 2026.
- European Commission Article 50 guidelines, published 20 July 2026: transparency obligations apply from 2 August 2026.
- European Commission Code of Practice FAQ: the limited pre-existing-system transition is described in connection with the AI Omnibus proposal and must not be represented as binding before final adoption and Official Journal verification.
- Commission Opinion and AI Board adequacy assessment: adherence to the voluntary transparency code does not constitute conclusive evidence of compliance.

## Product control

`resolveArticle50EffectiveDate` fails closed:

1. base application date is always 2026-08-02;
2. a political agreement, proposal, FAQ or voluntary code cannot activate an amended date;
3. the transition requires both a qualifying pre-existing system and retained evidence that the final amending act was verified in the Official Journal;
4. Article 50(4) deployer disclosures never inherit the Article 50(2) transition;
5. limitations and source metadata remain attached to every decision.

## Remaining integration work

The existing transparency dashboard still contains a static synthetic-content deadline. It must be migrated to this resolver before the date can be shown as a binding customer deadline. Until then, the dashboard copy must not be relied on as legal evidence.

## Truth boundary

This control supports legal operations and product workflow integrity. It does not provide legal advice, certify compliance, replace qualified review or prove that a customer use case satisfies an exception or transition condition.
