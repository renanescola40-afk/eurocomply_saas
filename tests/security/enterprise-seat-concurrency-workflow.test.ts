import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/enterprise-seat-concurrency.yml', 'utf8');

describe('enterprise seat concurrency workflow governance', () => {
  it('uses read-only permissions and exact-SHA checkout', () => {
    expect(workflow).toContain('permissions:\n  contents: read');
    expect(workflow).toContain('github.event.pull_request.head.sha || github.sha');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).toContain('Verify exact assessed checkout');
  });

  it('runs both domain and migration contracts', () => {
    expect(workflow).toContain('src/server/enterprise/seat-capacity.test.ts');
    expect(workflow).toContain('tests/enterprise/enterprise-seat-concurrency-migration.test.ts');
  });

  it('retains an exact-SHA report without promoting runtime claims', () => {
    expect(workflow).toContain('report-seat-concurrency-gap.mjs');
    expect(workflow).toContain('retention-days: 90');
    expect(workflow).not.toContain('contents: write');
  });
});
