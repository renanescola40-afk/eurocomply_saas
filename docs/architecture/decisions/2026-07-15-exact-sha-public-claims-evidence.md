# Bind public claims evidence to the exact release SHA

Date: 2026-07-15  
Status: Proposed

## Context

RISCK COMPLY already blocks unsupported customer-facing claims in mandatory Security CI. The Enterprise Readiness Scorecard nevertheless expected a repository runtime JSON file for Trust Center, Security page, and qualified-compliance claims. Public copy is a versioned release property rather than a provider-runtime property, and a committed `Complete` JSON could become stale while continuing to increase the score.

## Decision

- run the public claims scanner in a dedicated `Public Claims Guard` workflow on every pull request, main push, and manual dispatch;
- bind the scan to the exact pull-request head or pushed commit SHA;
- emit a 90-day workflow artifact containing policy hash, aggregate content hash, per-file hashes, scan targets, and explicit Trust Center, Security page, and compliance-claims checks;
- include the workflow in the exact-SHA GitHub evidence collector;
- permit scorecard evidence changes only through a validated evidence-only override file;
- map TRU-01, TRU-02, and TRU-03 to the exact-SHA `publicClaims` check;
- reject unknown controls, duplicate overrides, or attempts to alter titles, weights, or criticality.

## Security and compliance impact

A claim change cannot retain PASS merely because an older JSON remains in the repository. The scanner runs on the same SHA evaluated by the scorecard, and failures remain blocking. The report contains repository paths and hashes only; it must not contain secrets, customer data, provider payloads, or tenant identifiers.

## Evidence boundary

This mechanism proves that the versioned customer-facing source surfaces passed the repository claims policy for one exact commit. It does not constitute legal review, regulator acceptance, production deployment proof, certification, external audit, penetration testing, or verification that every rendered runtime string matches the source under all provider conditions.

## Risks and trade-offs

- three Trust controls depend on one dedicated workflow because that workflow explicitly reports three separate source-surface checks;
- a scanner-policy defect could miss a misleading phrase, so legal and product review remain necessary;
- the scorecard workflow waits for one additional workflow;
- the evidence override mechanism adds configuration complexity, mitigated by strict validation and tests;
- changing the claims policy or source content changes the artifact hashes but does not automatically prove legal approval.

## Rollback

Revert this change. TRU-01, TRU-02, and TRU-03 return to `NOT_VERIFIED` unless an equivalent exact-SHA evidence mechanism exists. Do not replace the workflow artifact with a manually authored `Complete` file.
