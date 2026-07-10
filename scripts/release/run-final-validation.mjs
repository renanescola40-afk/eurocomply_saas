#!/usr/bin/env node

// Compatibility wrapper for older release docs and automations.
// The canonical final gate is now npm run release:production-final.
//
// Day 1 control-plane compatibility contract:
// The delegated canonical gate must continue to enforce these baseline release steps:
// - npm ci
// - npm run lint
// - npm run typecheck
// - npm run test
// - npm run build
//
// The canonical gate also runs:
// - enterprise env preflight
// - E2E/security checks
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
