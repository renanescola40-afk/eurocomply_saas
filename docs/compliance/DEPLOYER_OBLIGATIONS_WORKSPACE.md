# Deployer Obligations Workspace

Operational model for deployers under the EU AI Act. Each obligation records applicability, owner, deadline, evidence, approval, review freshness, findings and rationale for non-applicability.

Covered domains include instructions of use, human oversight, operator competence, input-data quality, monitoring, logging, provider cooperation, suspension, incidents, worker information, affected-person information, explanations, DPIA, FRIA, EU database registration and authority cooperation.

The engine is fail-closed: unresolved applicability, missing owner/deadline/evidence, stale review, missing approval or critical findings prevent readiness. A `not_applicable` result requires an explicit rationale.

This workflow supports governance and evidence preparation. It does not determine legal applicability or replace qualified legal review.
