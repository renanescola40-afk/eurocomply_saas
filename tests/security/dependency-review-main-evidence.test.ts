import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/dependency-review.yml', 'utf8');
const scorecard = readFileSync('scripts/enterprise/capture-github-checks-evidence.mjs', 'utf8');

describe('dependency review exact-main-SHA evidence', () => {
  it('runs on pull requests and on the resulting main SHA', () => {
    expect(workflow).toMatch(/pull_request:\s*\n\s+branches:\s*\n\s+- main/);
    expect(workflow).toMatch(/push:\s*\n\s+branches:\s*\n\s+- main/);
    expect(scorecard).toContain("'Dependency Review'");
    expect(scorecard).toContain("dependencyReview: 'Dependency Review'");
  });

  it('keeps the pull-request-only dependency graph comparison out of push runs', () => {
    expect(workflow).toContain(
      "if: github.event_name == 'pull_request' && steps.dependency_changes.outputs.changed == 'true'",
    );
    expect(workflow).toContain(
      "if: github.event_name == 'pull_request' && steps.dependency_changes.outputs.changed == 'true' && steps.dependency_graph.outputs.available == 'true'",
    );
    expect(workflow).toContain('npm run security:npm-audit:all');
  });
});
