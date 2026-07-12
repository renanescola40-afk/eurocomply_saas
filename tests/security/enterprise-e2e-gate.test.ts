import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/full-security-suite.yml', 'utf8');
const e2eGate = workflow.match(
  /- name: Required production-like Playwright E2E gate[\s\S]*?\n      - name: npm audit moderate gate/,
)?.[0];

describe('enterprise E2E merge gate', () => {
  it('is present and runs after the production build', () => {
    expect(e2eGate).toBeTruthy();
    expect(workflow.indexOf('- name: Build')).toBeLessThan(
      workflow.indexOf('- name: Required production-like Playwright E2E gate'),
    );
    expect(e2eGate).toContain("PLAYWRIGHT_USE_PRODUCTION_SERVER: 'true'");
    expect(e2eGate).toContain('npm run test:e2e');
  });

  it('fails closed when the script, config or runtime is unavailable', () => {
    expect(e2eGate).toContain('Missing Playwright E2E script');
    expect(e2eGate).toContain('Missing Playwright configuration');
    expect(e2eGate).toContain('E2E runtime unavailable');
    expect(e2eGate?.match(/exit 1/g)?.length).toBeGreaterThanOrEqual(3);
    expect(e2eGate).not.toContain('Skipping E2E');
  });
});
