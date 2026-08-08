# High-Risk Provider Runtime Evidence Promotion

## Promotion conditions

Promote `HIGH-RISK-PROVIDER` runtime coverage only when all conditions hold:

1. the source workflow is `High-Risk Provider Runtime Evidence`;
2. the workflow completed successfully for the exact assessed SHA;
3. focused high-risk provider and operational contract tests passed before artifact generation;
4. `targetSha` equals the assessed SHA;
5. `status` is `PASS`;
6. `syntheticData` is explicitly `true`;
7. all ten encoded controls are `PASS`;
8. the independent validator accepts the source digest and artifact integrity digest;
9. limitations remain present;
10. the artifact is supplied through the exact-SHA evidence overlay.

## Reject evidence when

Reject or invalidate the artifact if it is stale, from another repository or SHA, malformed, missing limitations, missing controls, has an invalid digest, or claims customer/production facts that the workflow did not observe.

A successful repository CI artifact must never be relabelled as customer dataset validation, production proof, regulator acceptance or qualified methodology review.

## Scorecard use

The expected path is:

`docs/security/evidence/runtime/high-risk-provider-validation.json`

The retained workflow artifact mirrors that path beneath `artifacts/high-risk-provider-runtime/`. The product coverage generator receives that directory via `EU_AI_ACT_RUNTIME_EVIDENCE_ROOTS`.

## Invalidation

Regenerate evidence for every new SHA that changes the provider-data engine, API, query layer, migration, dashboard, tests, evidence generator or validator. Never carry a passing artifact forward to a different revision.

## Human review

Runtime promotion does not satisfy `docs/compliance/evidence/accepted/high-risk-provider-methodology-review.json`. That file may only be accepted from a genuine qualified independent reviewer under the existing review process.
