# Localized metadata copy review

## Scope

This review covers the root metadata descriptions rendered by `src/app/[locale]/layout.tsx` for English, Portuguese, Spanish, French, Italian and German.

## Decision

The product name remains consistent across locales. Descriptions use native-language diacritics and locally natural wording while preserving the same evidence-safe positioning:

- AI Act readiness support;
- AI system inventory;
- risk visibility;
- governance evidence preparation;
- compliance operations workflows.

The copy intentionally avoids claims that the product guarantees compliance, replaces legal counsel, is certified, or automatically makes a customer compliant.

## Regression control

`tests/i18n/localized-metadata-copy.test.ts` verifies that every supported locale retains a description, required native-language diacritics remain present, and the previous ASCII transliterations do not return.

## Runtime impact

Copy-only metadata change. No authentication, tenant isolation, database, billing, API, deployment or customer-data behavior changes.
