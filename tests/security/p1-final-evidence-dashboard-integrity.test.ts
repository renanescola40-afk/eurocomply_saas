import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const runnerSource = readFileSync(
  join(process.cwd(), 'scripts/security/run-p1-final-evidence-gate.mjs'),
  'utf8',
);
const documentationSource = readFileSync(
  join(process.cwd(), 'docs/security/P1_FINAL_EVIDENCE_GATE.md'),
  'utf8',
);

describe('P1 final evidence dashboard integrity', () => {
  it('fails closed when the generated progress dashboard differs from the index', () => {
    expect(runnerSource).toContain(
      "run('git', ['diff', '--exit-code', 'docs/security/evidence/p1/P1_PROGRESS.md']);",
    );
    expect(runnerSource).not.toMatch(
      /P1_PROGRESS\.md'\]\s*,\s*\{\s*allowFailure:\s*!strict\s*\}/,
    );
  });

  it('keeps completeness strictness separate from dashboard truthfulness', () => {
    expect(runnerSource).toContain("...(strict ? ['--strict'] : [])");
    expect(documentationSource).toContain(
      'Missing final evidence remains allowed in non-strict mode',
    );
    expect(documentationSource).toContain(
      'is always a blocking failure',
    );
  });
});
