#!/usr/bin/env node

// Compatibility wrapper for older release docs and automations.
// The canonical final gate is now npm run release:production-final, which runs:
// - enterprise env preflight
// - CI/build/test/E2E/security checks
// - live RLS evidence
// - deployment smoke
// - observability smoke
// - rollback dry-run
// - enterprise runtime evidence aggregation
// - strict P0 runtime gap gate
//
// Keep this file so older workflows that call node scripts/release/run-final-validation.mjs
// execute the same fail-closed enterprise production contract instead of the deprecated bundle.

process.env.RELEASE_TARGET = process.env.RELEASE_TARGET || 'enterprise';

await import('./run-public-production-release.mjs');
