# Legal Review Preparation Changelog

## 2026-07-30 — Mega PR 1

### Added

- deterministic baseline truth-audit engine;
- exact-SHA, reviewer identity, qualification, validity, placeholder and signed-reference gates;
- tests for missing reviews, valid reviews, SHA mismatch and false legal credit;
- CI workflow producing a non-crediting baseline report artifact;
- baseline truth report in JSON and Markdown;
- product dossier and intended-purpose statement;
- architecture/data-flow and feature/route inventories;
- security-control map;
- preliminary AI Act classification memorandum in Markdown and JSON;
- official legal-source register;
- article × function × evidence matrix in JSON and Markdown;
- ADR for separation of technical evidence and human legal acceptance.

### Truth corrections

- confirmed that all eight qualified accepted-review files are absent;
- fixed the reported human legal acceptance at 0%;
- classified the eight review areas as `HUMAN_REVIEW_REQUIRED`;
- recorded the missing enterprise-readiness JSON artifact as `NOT_VERIFIED`;
- preserved technical pending statuses without treating them as counsel acceptance;
- confirmed the repository legal-rules implementation includes Regulation (EU) 2026/1744.

### Not completed by this change

- no lawyer identity, signature, approval or opinion was created;
- no customer-specific compliance conclusion was made;
- no formal conformity assessment was performed;
- founder legal-entity and operational facts remain pending;
- contracts, privacy pack, claims register, eight complete review folders and final counsel handoff remain later phases.
