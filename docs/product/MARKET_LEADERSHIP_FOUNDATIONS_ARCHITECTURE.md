# Market Leadership Foundations Architecture

## Category thesis

RISCK COMPLY is being developed as a European AI Governance & Regulatory Operations Platform. The durable product advantage is not a larger checklist. It is the connection between AI assets, regulatory obligations, operational controls, evidence, runtime events and business decisions.

## Foundation 1 — Governance digital twin

`ai_governance_entities` stores systems, models, agents, datasets, vendors and use cases in one versioned tenant-scoped graph. `ai_governance_entity_links` captures dependencies without collapsing distinct entity types.

The graph is designed to answer operational questions such as:

- which systems depend on a changed vendor or model;
- which agents can call a sensitive tool;
- which affected-person groups are connected to a use case;
- which controls and evidence must be re-evaluated after a material change.

## Foundation 2 — Control once, map everywhere

`normalized_ai_controls` represents one canonical operational control. `normalized_ai_control_mappings` links that control to versioned framework requirements. Mapping strength and rationale are explicit; no framework mapping is treated as legal equivalence by default.

## Foundation 3 — Evidence by design

`governance_evidence_objects` makes evidence a first-class object with provenance, environment, class, validity, integrity digest, limitations and review state.

Hard boundaries:

- synthetic evidence cannot be production evidence;
- a generated document is not an approval;
- expired evidence cannot be reused as current;
- production proof is bounded to the observed event and environment;
- legal, external-assurance and qualified-review conclusions remain external human decisions.

## Foundation 4 — Regulatory change impact

`regulatory_change_impacts` records organization-specific consequences of a versioned legal, guidance, code or standard change. A change is not actionable until the source and affected scope are resolved. Draft and unknown sources fail closed to human review.

## Foundation 5 — Measurable time to value

`governance_value_events` records only first-value milestones. It is not a compliance score. It measures whether the product helps a customer create an inventory, classify a system, accept evidence and produce a report quickly.

## Security model

All new tables:

- require `organization_id`;
- enable and force RLS;
- allow only tenant-scoped authenticated reads;
- expose no anonymous access;
- grant no authenticated browser write privileges;
- rely on authorized server-side mutation paths to be implemented against the canonical permission layer.

## Rollout sequence

1. apply migration in a protected environment;
2. run tenant-isolation and migration-contract suites;
3. add server repositories and permission-checked mutation APIs;
4. backfill existing inventory into the digital twin with reversible mapping;
5. instrument first-value events;
6. add graph and regulatory-impact UI;
7. collect staging runtime evidence;
8. collect production evidence only after explicit release authorization.

## External validation boundary

Repository code and tests do not prove production migration application, customer adoption, market leadership, runtime scale, legal correctness, certification or regulator acceptance.
