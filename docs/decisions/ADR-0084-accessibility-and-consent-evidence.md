# ADR-0084: Validate accessibility and analytics consent on the exact release SHA

- Status: Proposed
- Date: 2026-07-16
- Decision owners: Product Engineering, Privacy Engineering and Release Engineering

## Context

The enterprise readiness model contains separate controls for keyboard accessibility, screen-reader accessibility and analytics consent. Public UX acceptance already proves that landing, pricing, login, mobile layouts and locale prefixes render on the exact SHA, but it does not prove keyboard reachability, programmatic labels, ARIA reference integrity or consent-gated analytics loading.

The analytics implementation blocks PostHog initialization until consent is granted. Two gaps remained: the consent banner did not expose dialog semantics or an intentional initial focus target, and session-recording updates did not independently re-check consent before starting recording.

Repository source alone is not sufficient evidence that these browser behaviors execute. The controls require a dedicated production-like Playwright suite inside the required Full Security Suite and scorecard evidence bound to the same SHA.

## Decision

Add a dedicated browser acceptance suite that:

1. traverses landing, pricing and login controls using the keyboard;
2. validates main landmarks, primary headings, programmatic form labels, interactive accessible names, image alternatives, unique IDs and valid ARIA references;
3. verifies that the consent dialog receives focus and is labelled and described programmatically;
4. verifies that the PostHog script is absent before consent;
5. verifies that declining persists the denial and does not load the script;
6. verifies that explicit consent loads only a synthetic CI PostHog script;
7. verifies that denial stops session recording and that recording updates fail closed without consent.

The Full Security Suite will compile and run the application with a synthetic public PostHog key and a non-routable CI analytics host. No production analytics key, event payload or customer data is used.

Generate separate accessibility and analytics-consent evidence documents only after the Full Security Suite and aggregate required checks pass for the exact assessed SHA.

## Consequences

### Positive

- Keyboard and semantic regressions on critical public surfaces become merge-blocking.
- Analytics cannot earn a scorecard PASS from static configuration alone.
- Consent denial and replay gating are tested as browser behavior.
- Evidence contains only booleans, source digests and exact-SHA provenance.
- The synthetic analytics host prevents CI from sending product events to a real provider project.

### Risks and trade-offs

- Chromium semantic checks do not certify every screen reader, browser or WCAG success criterion.
- The suite covers public landing, pricing, login and the consent banner; authenticated onboarding and dashboard accessibility remain separate work.
- DOM-based accessible-name checks are intentionally strict and may require remediation when new controls are added.
- The synthetic PostHog script proves the consent boundary, not production ingestion or legal sufficiency of the consent copy.
- Automatically focusing the consent dialog can interrupt users arriving mid-navigation, but provides a deterministic keyboard and assistive-technology entry point when consent is required.

## Validation

Vitest validates the evidence generator, exact-SHA requirements and fail-closed behavior. Playwright validates keyboard navigation, semantic contracts and both consent decisions in the built application. The Enterprise Readiness Scorecard reads only evidence generated after required checks pass on the exact SHA.

No external accessibility certification, legal review, production analytics delivery or authenticated product acceptance is claimed.

## Rollback

Revert the pull request containing this ADR. The three controls return to `NOT_VERIFIED`, the consent banner loses the added dialog/focus semantics, and session-recording updates return to their previous behavior. No database, provider, credential, schema or customer-data rollback is required.
