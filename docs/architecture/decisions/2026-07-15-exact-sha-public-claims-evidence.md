# Bind public claims evidence to the exact release SHA

Date: 2026-07-15  
Status: Proposed

## Context

RISCK COMPLY already blocks unsupported customer-facing claims in mandatory Security CI. The Enterprise Readiness Scorecard nevertheless expected a repository runtime JSON file for Trust Center, Security page, and qualified-compliance claims. Public copy is a versioned release property rather than a provider-runtime property, and a committed `Complete` JSON could become stale while continuing to increase the score.

The initial evidence-override implementation limited which object fields could be changed, but accepted any non-empty evidence path and check name. Because the scorecard can also read repository JSON documents, that validation was insufficient: a future override could point a control at an unrelated PASS document. The canonical scorecard pipeline therefore requires a separate fail-closed allowlist guard before evidence collection or score generation.

## Decision

- run the public claims scanner in a dedicated `Public Claims Guard` workflow on every pull request, main push, and manual dispatch;
- bind the scan to the exact pull-request head or pushed commit SHA;
- emit a 90-day workflow artifact containing policy hash, aggregate content hash, per-file hashes, scan targets, and explicit Trust Center, Security page, and compliance-claims checks;
- include the workflow in the exact-SHA GitHub evidence collector;
- permit scorecard evidence changes only through an evidence-only override file;
- execute `check-evidence-overrides.mjs` before the canonical scorecard tests, evidence capture, and score generation;
- allow exactly TRU-01, TRU-02, and TRU-03;
- allow exactly `artifacts/trust-claims/trust-claims-validation.json` with the exact-SHA `publicClaims` check for those controls;
- reject added, removed, duplicate, unknown, malformed, or policy-changing override entries;
- require the approved controls to still exist in the base 100-control configuration;
- reject attempts to alter titles, weights, criticality, domain structure, or any field outside `controlId`, `evidence.path`, and `evidence.check`.

The generic scorecard engine remains capable of reading its base evidence definitions. The workflow-generated canonical artifact is authoritative only when the dedicated override guard passes on the same repository revision.

## Security and compliance impact

A claim change cannot retain PASS merely because an older JSON remains in the repository. The scanner runs on the same SHA evaluated by the scorecard, and failures remain blocking.

An override cannot redirect a Trust control to an arbitrary repository JSON file or another GitHub check. Any change to the approved control set, path, or check requires an explicit code review of the allowlist and its regression tests.

The report contains repository paths and hashes only; it must not contain secrets, customer data, provider payloads, or tenant identifiers.

## Verification

The canonical workflow fails before scoring when the override guard fails. Focused tests cover:

- the committed approved pairs;
- arbitrary repository paths;
- unsupported or omitted check names;
- added controls;
- removed controls;
- duplicate controls;
- unknown controls;
- extra policy-changing fields.

The exact-SHA collector and scorecard still require the `Public Claims Guard` result to belong to the expected commit.

## Evidence boundary

This mechanism proves that the versioned customer-facing source surfaces passed the repository claims policy for one exact commit and that the canonical scorecard used only the approved Trust evidence mapping.

It does not constitute legal review, regulator acceptance, production deployment proof, certification, external audit, penetration testing, or verification that every rendered runtime string matches the source under all provider conditions.

## Risks and trade-offs

- three Trust controls depend on one dedicated workflow because that workflow explicitly reports three separate source-surface checks;
- a scanner-policy defect could miss a misleading phrase, so legal and product review remain necessary;
- the scorecard workflow waits for one additional workflow and one fail-closed guard;
- adding a future evidence override requires an explicit allowlist and test change;
- direct local invocation of low-level scorecard functions is not the canonical release artifact path; the protected workflow is authoritative;
- changing the claims policy or source content changes the artifact hashes but does not automatically prove legal approval.

## Rollback

Revert this change. TRU-01, TRU-02, and TRU-03 return to `NOT_VERIFIED` unless an equivalent exact-SHA evidence mechanism exists. Do not replace the workflow artifact with a manually authored `Complete` file.
