import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
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
    const parserOverride = manifest.overrides['@typescript-eslint/typescript-estree'] as { minimatch?: string };
    expect(parserOverride.minimatch).toBe('11.0.1');
    expect(lockfile.packages['node_modules/@typescript-eslint/typescript-estree/node_modules/minimatch']?.version).toBe('11.0.1');
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

  it('keeps the CommonJS/ESM glob and minimatch APIs used by the toolchain callable', () => {
    expect(globSync('package.json')).toContain('package.json');
  });
});
