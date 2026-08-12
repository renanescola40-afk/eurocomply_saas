import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const workflow = readFileSync(
  join(process.cwd(), '.github/workflows/ci.yml'),
  'utf8',
);

describe('required CI production environment governance', () => {
  it('has read-only Actions permission for environment verification', () => {
    expect(workflow).toContain('permissions:');
    expect(workflow).toContain('contents: read');
    expect(workflow).toContain('actions: read');
    expect(workflow).not.toMatch(/actions:\s*write/);
  });

  it('fails closed on both secrets-bearing production environments before ordinary quality gates', () => {
    const governance = workflow.indexOf('Production deployment environment governance gate');
    const lint = workflow.indexOf('- name: Lint');

    expect(governance).toBeGreaterThan(-1);
    expect(lint).toBeGreaterThan(governance);

    const boundary = workflow.slice(governance, lint);
    expect(boundary).toContain('GITHUB_TOKEN: ${{ github.token }}');
    expect(boundary).toContain("REQUIRE_PROTECTED_BRANCHES: 'true'");
    expect(boundary).toContain('GITHUB_ENVIRONMENT_NAME=Production node scripts/security/check-github-environment-governance.mjs');
    expect(boundary).toContain('GITHUB_ENVIRONMENT_NAME=enterprise-production-closeout node scripts/security/check-github-environment-governance.mjs');
    expect(boundary).not.toMatch(/secrets\./);
  });
});
