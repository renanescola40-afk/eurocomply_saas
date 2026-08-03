import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const generator = readFileSync('scripts/compliance/generate-article-50-runtime-evidence.mjs', 'utf8');
const validator = readFileSync('scripts/compliance/validate-article-50-runtime-evidence.mjs', 'utf8');
const workflow = readFileSync('.github/workflows/article-50-runtime-evidence.yml', 'utf8');
const runtimeRegistry = readFileSync('docs/compliance/eu-ai-act-runtime-evidence-registry.json', 'utf8');

describe('Article 50 runtime evidence closure', () => {
  it('binds evidence to an exact full SHA and integrity digest', () => {
    expect(generator).toContain("TARGET_SHA");
    expect(generator).toContain("targetSha");
    expect(generator).toContain("integrity");
    expect(validator).toContain('stale or mismatched SHA');
    expect(validator).toContain('digest mismatch');
  });

  it('preserves the truth boundary between CI and customer evidence', () => {
    expect(generator).toContain("environment: 'ci'");
    expect(generator).toContain('syntheticData: true');
    expect(generator).toContain('does not prove a customer deployment');
    expect(generator).toContain('does not replace qualified legal or linguistic review');
  });

  it('runs every focused Article 50 contract before generating evidence', () => {
    for (const path of [
      'article-50-effective-dates.test.ts',
      'article-50-control-plane.test.ts',
      'article-50-deadlines.test.ts',
      'article-50-operational-api-contract.test.ts',
      'article-50-operational-migration-contract.test.ts',
      'article-50-operational-ui-contract.test.ts',
    ]) {
      expect(workflow).toContain(path);
    }
    expect(workflow.indexOf('Focused Article 50 tests')).toBeLessThan(
      workflow.indexOf('Generate exact-SHA evidence'),
    );
  });

  it('uses a dedicated Article 50 runtime artifact in the canonical registry', () => {
    expect(runtimeRegistry).toContain('article-50-operational-validation.json');
    expect(runtimeRegistry).not.toMatch(/ARTICLE-50[^\n]+localization-validation\.json/);
  });
});
