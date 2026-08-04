# P0 runtime register source-of-truth implementation manifest

Status: **implemented, pending merge and CI validation**.

This Mega PR consolidates the P0 release register around one exact-SHA, evidence-derived artifact.

## Included workstreams

1. Canonical runtime validators determine status.
2. Versioned Markdown becomes policy metadata only.
3. Repository dependency controls are recalculated from the checkout.
4. JSON and Markdown artifacts are generated per SHA.
5. A semantic validator independently recomputes counts and decision.
6. SHA-256 integrity protects the generated result.
7. Three P0 workflows use the same generator and validator.
8. The competing legacy renderer and tests are removed.
9. Focused source-of-truth contracts prevent regression.
10. Schema, ADR, threat model, runbook and operator guidance are included.

## Boundary

This implementation does not manufacture provider evidence, execute an external pentest, approve legal review or declare Enterprise GO. Missing controls remain `Open` in generated output.
