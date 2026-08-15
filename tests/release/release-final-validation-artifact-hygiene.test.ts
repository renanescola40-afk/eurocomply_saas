import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/release-final-validation.yml', 'utf8');
const gitignore = readFileSync('.gitignore', 'utf8');

describe('release final validation artifact hygiene', () => {
  it('keeps generated validation output out of source control and uploads nested current-run output', () => {
    expect(gitignore.split(/\r?\n/)).toContain('release-validation/');
    expect(workflow).toContain('release-validation/**');
    expect(workflow).not.toContain('release-validation/summary.json');
    expect(workflow).not.toContain('release-validation/summary.md');
    expect(workflow).not.toContain('release-validation/logs/*.log');
  });

  it('retains the assessed commit marker alongside runtime-generated validation output', () => {
    expect(workflow).toContain('assessed-commit.txt');
    expect(workflow).toContain('if: always()');
    expect(workflow).toContain('uses: actions/upload-artifact@v7');
  });
});
