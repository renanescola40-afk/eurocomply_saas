# Article 50 Operational Control Plane

## Purpose

This control plane converts the effective-date resolver into portfolio-level operational decisions without presenting a proposal, code of practice or political agreement as binding law.

## Ten consolidated capabilities

1. binding base-date resolution;
2. limited pre-existing-system transition handling;
3. provider/deployer duty separation;
4. retained Official Journal evidence requirement;
5. machine-readable marking gate;
6. human-readable disclosure gate;
7. unknown placement-date escalation;
8. portfolio aggregation;
9. explicit blockers and warnings;
10. CI regression enforcement.

## Status semantics

- `READY`: required technical evidence is present and no warning remains.
- `NEEDS_REVIEW`: no technical blocker is detected, but a material fact remains uncertain.
- `BLOCKED`: a mandatory control or retained source evidence is missing.

A `READY` result is not a legal opinion, certification, regulator approval or guarantee of compliance.

## Legal truth boundary

The binding base date remains 2 August 2026. A 2 December 2026 transition may be returned only for a qualifying pre-existing system, only for Article 50(2) marking/detection duties, and only after the final amending act and entry-into-force provisions are verified and retained from the Official Journal.

Article 50(4) deployer disclosure duties never inherit that transition through this control plane.

## Evidence requirements

Every production decision must retain:

- system identifier and organization scope;
- placement-on-market or put-into-service date evidence;
- obligation and role;
- exact rule version and source URL;
- Official Journal evidence identifier when a transition is claimed;
- disclosure copy, language, channel and proof of display;
- machine-readable marking validation where applicable;
- evaluated timestamp and code SHA;
- limitations and reviewer status.

## Runtime promotion

Repository tests and CI prove only deterministic implementation behavior. Staging or production evidence must be generated separately against the exact deployed SHA and may not be substituted by this document or by a local test result.

## Human review

The Article 50 qualified review remains `HUMAN_REVIEW_REQUIRED`. The review packet must be completed by a real qualified and independent reviewer. Identity, qualification, independence, signature and acceptance must not be synthesized.
