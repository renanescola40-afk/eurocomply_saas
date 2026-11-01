import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const fullSecuritySuite = readFileSync('.github/workflows/full-security-suite.yml', 'utf8');
const scorecardJob = fullSecuritySuite.match(/\n  scorecard:\n([\s\S]*?)\n  enterprise-gate:/)?.[1] ?? '';

describe('private repository OSSF Scorecard permissions', () => {
  it('grants only the documented read permissions required for private repository metadata', () => {
    expect(scorecardJob).toContain('contents: read');
    expect(scorecardJob).toContain('issues: read');
    expect(scorecardJob).toContain('pull-requests: read');
    expect(scorecardJob).toContain('checks: read');
    expect(scorecardJob).toContain('security-events: write');
    expect(scorecardJob).toContain('id-token: write');
    expect(scorecardJob).not.toContain('contents: write');
    expect(scorecardJob).not.toContain('issues: write');
    expect(scorecardJob).not.toContain('pull-requests: write');
    expect(scorecardJob).not.toContain('checks: write');
  });
});
