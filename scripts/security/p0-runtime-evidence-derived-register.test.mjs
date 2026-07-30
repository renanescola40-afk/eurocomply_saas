import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { evaluateP0RuntimeEvidence } from './evaluate-p0-runtime-evidence.mjs';
import {
  deriveP0Register,
  renderP0RegisterMarkdown,
} from './derive-p0-runtime-evidence-register.mjs';

const temporaryRoots = [];

afterEach(() => {
  while (temporaryRoots.length > 0) {
    fs.rmSync(temporaryRoots.pop(), { recursive: true, force: true });
  }
});

function createFixture({ evidence, registerStatus = 'Complete' }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'p0-derived-register-'));
  temporaryRoots.push(root);
  const registerPath = path.join('docs', 'security', 'P0_RUNTIME_EVIDENCE_REGISTER.md');
  const runtimeDir = path.join('docs', 'security', 'evidence', 'runtime');
  fs.mkdirSync(path.join(root, runtimeDir), { recursive: true });
  fs.writeFileSync(
    path.join(root, registerPath),
    [
      '# P0 Runtime Evidence Register',
      '',
      '| Evidence item | Status | Required evidence | Owner | Next action |',
      '| --- | --- | --- | --- | --- |',
      `| Runtime proof | ${registerStatus} | proof.json must pass | Security owner | Run proof |`,
      '| Repository proof | Complete | repository check must pass | Engineering owner | None |',
      '',
    ].join('\n'),
  );
  fs.writeFileSync(path.join(root, runtimeDir, 'proof.json'), JSON.stringify(evidence));
  return { root, registerPath, runtimeDir };
}

const runtimeEntry = {
  item: 'Runtime proof',
  kind: 'runtime',
  file: 'proof.json',
  validator: (evidence, context) => (
    evidence.boundSha === context.expectedCommitSha ? [] : ['wrong SHA']
  ),
};
const repositoryEntry = {
  item: 'Repository proof',
  kind: 'repository',
};

describe('P0 runtime evidence evaluator and derived register', () => {
  it('marks runtime evidence Complete only after canonical validation passes', () => {
    const sha = 'a'.repeat(40);
    const fixture = createFixture({
      evidence: { status: 'Complete', outcome: 'passed', boundSha: sha },
    });
    const evaluation = evaluateP0RuntimeEvidence({
      ...fixture,
      expectedCommitSha: sha,
      catalogItems: [runtimeEntry],
      now: new Date('2026-07-30T19:00:00.000Z'),
    });
    const derived = deriveP0Register({
      evaluation,
      catalog: [runtimeEntry, repositoryEntry],
      generatedAt: new Date('2026-07-30T19:00:00.000Z'),
    });

    expect(evaluation.results[0].evidenceSatisfied).toBe(true);
    expect(derived.decision).toBe('Go');
    expect(derived.counts).toMatchObject({ complete: 2, total: 2, overclaims: 0 });
    expect(derived.rows[0]).toMatchObject({
      sourceStatus: 'Complete',
      derivedStatus: 'Complete',
      drift: 'none',
    });
  });

  it('detects a committed Complete status as an overclaim when validation fails', () => {
    const fixture = createFixture({
      evidence: {
        status: 'Complete',
        outcome: 'passed',
        boundSha: 'b'.repeat(40),
      },
    });
    const evaluation = evaluateP0RuntimeEvidence({
      ...fixture,
      expectedCommitSha: 'a'.repeat(40),
      catalogItems: [runtimeEntry],
      now: new Date('2026-07-30T19:00:00.000Z'),
    });
    const derived = deriveP0Register({
      evaluation,
      catalog: [runtimeEntry, repositoryEntry],
      generatedAt: new Date('2026-07-30T19:00:00.000Z'),
    });

    expect(evaluation.results[0].evidenceSatisfied).toBe(false);
    expect(evaluation.results[0].validatorFailures).toContain('wrong SHA');
    expect(derived.decision).toBe('No-Go');
    expect(derived.overclaims).toHaveLength(1);
    expect(derived.rows[0]).toMatchObject({
      sourceStatus: 'Complete',
      derivedStatus: 'Open',
      drift: 'overclaim',
    });
  });

  it('keeps an underclaim visible without promoting the committed register', () => {
    const sha = 'a'.repeat(40);
    const fixture = createFixture({
      registerStatus: 'Open',
      evidence: { status: 'Complete', outcome: 'passed', boundSha: sha },
    });
    const evaluation = evaluateP0RuntimeEvidence({
      ...fixture,
      expectedCommitSha: sha,
      catalogItems: [runtimeEntry],
    });
    const derived = deriveP0Register({
      evaluation,
      catalog: [runtimeEntry, repositoryEntry],
    });

    expect(derived.underclaims).toHaveLength(1);
    expect(derived.rows[0]).toMatchObject({
      sourceStatus: 'Open',
      derivedStatus: 'Complete',
      drift: 'underclaim',
    });
  });

  it('renders the exact assessed SHA and derived No-Go state', () => {
    const fixture = createFixture({
      evidence: { status: 'Open', outcome: 'not_run', boundSha: null },
    });
    const evaluation = evaluateP0RuntimeEvidence({
      ...fixture,
      expectedCommitSha: 'a'.repeat(40),
      catalogItems: [runtimeEntry],
    });
    const derived = deriveP0Register({
      evaluation,
      catalog: [runtimeEntry, repositoryEntry],
      generatedAt: new Date('2026-07-30T19:00:00.000Z'),
    });
    const markdown = renderP0RegisterMarkdown(derived);

    expect(markdown).toContain('Current final decision: **No-Go**.');
    expect(markdown).toContain(`- Assessed commit: \`${'a'.repeat(40)}\``);
    expect(markdown).toContain('| Runtime proof | Open |');
  });
});
