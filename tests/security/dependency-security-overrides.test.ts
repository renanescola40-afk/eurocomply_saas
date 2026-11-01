import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import minimatchDefault, { minimatch, Minimatch } from 'minimatch';

const require = createRequire(import.meta.url);
const minimatchCommonJs = require('minimatch');
import { globSync } from 'glob';

const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as {
  dependencies: Record<string, string>;
  overrides: Record<string, unknown>;
};
const lockfile = JSON.parse(readFileSync('package-lock.json', 'utf8')) as {
  packages: Record<string, { version?: string }>;
};

describe('patched minimatch and Sentry glob dependency graph', () => {
  it('pins all minimatch installations to the patched release', () => {
    expect(manifest.overrides.minimatch).toBe('file:vendor/minimatch-compat');
    const installs = Object.entries(lockfile.packages)
      .filter(([path]) => path === 'node_modules/minimatch' || path.endsWith('/node_modules/minimatch'));
    expect(installs.length).toBeGreaterThan(0);
    expect(installs).toHaveLength(1);
    expect(installs[0][1].version).toBe('11.0.1');
  });

  it('pins only the Sentry bundler glob edge to the patched compatible release', () => {
    const sentryOverride = manifest.overrides['@sentry/bundler-plugins'] as { glob?: string };
    expect(sentryOverride.glob).toBe('14.0.2');
    expect(lockfile.packages['node_modules/glob']?.version).toBe('14.0.2');
    expect(manifest.dependencies['@sentry/nextjs']).toBe('11.10.0');
    for (const name of ['@sentry/nextjs', '@sentry/node', '@sentry/bundler-plugins']) {
      expect(lockfile.packages[`node_modules/${name}`]?.version).toBe('11.10.0');
    }
  });

  it('preserves the ESM default/named and CommonJS minimatch API contracts', () => {
    expect(minimatchDefault).toBe(minimatch);
    expect(minimatch('src/security.ts', '**/*.ts')).toBe(true);
    expect(minimatchCommonJs('src/security.ts', '**/*.ts')).toBe(true);
    expect(minimatchCommonJs.Minimatch).toBe(Minimatch);
    expect(minimatchCommonJs.default).toBe(minimatchCommonJs);
  });

  it('keeps the patched Sentry glob API callable', () => {
    expect(globSync('package.json')).toContain('package.json');
  });
});
