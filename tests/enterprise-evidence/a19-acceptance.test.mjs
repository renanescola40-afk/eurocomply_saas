import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import * as validator from '../../scripts/enterprise-evidence/validate-evidence.mjs';

test('A-19 accepts only an authenticated exact-head formal review, and remains pending before review', async () => {
  const source = 'a'.repeat(40);
  const head = 'b'.repeat(40);
  const reviewer = 'renansilva2002-tech';
  const owner = 'renanescola40-afk';
  const repo = { full_name: owner + '/eurocomply_saas' };
  const digest = 'c'.repeat(64);
  const proof = {
    acceptance_source_sha: source,
    technical_comment_id: 6876516442,
    release_comment_id: 6876465909,
    artifact_id: 14111720488,
    workflow_run_id: 43587913240,
    artifact_sha256: digest,
  };
  const pull = { state: 'open', number: 42, head: { sha: head, repo }, base: { ref: 'main', repo }, user: { login: owner } };
  const review = {
    id: 123, state: 'APPROVED', commit_id: head, user: { login: reviewer },
    body: 'A-19/OPS-02 FORMAL GATE ACCEPTANCE: APPROVED', submitted_at: '2026-11-14T12:00:00Z',
    html_url: 'https://github.com/' + repo.full_name + '/pull/42#pullrequestreview-123',
  };
  const technical = {
    id: proof.technical_comment_id, user: { login: reviewer }, issue_url: 'https://api.github.com/repos/' + repo.full_name + '/issues/2616',
    body: '**OPS-02 technical decision: VERIFIED**\n' + source + '\n14111720488\n' + digest,
    updated_at: '2026-11-14T11:35:37Z',
  };
  const release = {
    id: proof.release_comment_id, user: { login: owner }, issue_url: technical.issue_url,
    body: '**Decision:** NO_GO\n**Reviewed source SHA:** `' + source + '`',
  };
  let reviews = [];
  const routes = {
    '/pulls/42': pull,
    ['/issues/comments/' + technical.id]: technical,
    ['/issues/comments/' + release.id]: release,
    ['/actions/runs/' + proof.workflow_run_id + '/artifacts?per_page=100']: { artifacts: [
      { id: proof.artifact_id, digest: 'sha256:' + digest, workflow_run: { head_sha: source } },
    ] },
  };
  const request = async url => {
    const path = url.split('/repos/' + repo.full_name)[1];
    const payload = path === '/pulls/42/reviews?per_page=100' ? reviews : routes[path];
    return { ok: payload !== undefined, json: async () => payload };
  };
  const artifact = routes['/actions/runs/' + proof.workflow_run_id + '/artifacts?per_page=100'].artifacts[0];
  const options = { expectedSha: head, prNumber: 42, token: 'test', request };
  assert.equal((await validator.verifyGitHubA19CurrentHead(proof, options))?.state, 'PENDING');
  reviews = [{ ...review, commit_id: source }];
  assert.equal((await validator.verifyGitHubA19CurrentHead(proof, options))?.state, 'PENDING');
  reviews = [{ ...review, user: { login: 'unqualified-reviewer' } }];
  assert.equal((await validator.verifyGitHubA19CurrentHead(proof, options))?.state, 'PENDING');
  reviews = [review];
  assert.equal(await validator.verifyGitHubA19CurrentHead(proof, { ...options, prNumber: 43 }), null);
  assert.equal(await validator.verifyGitHubA19CurrentHead(proof, { ...options, expectedSha: source }), null);
  artifact.digest = 'sha256:' + 'd'.repeat(64);
  assert.equal(await validator.verifyGitHubA19CurrentHead(proof, options), null);
  artifact.digest = 'sha256:' + digest;
  assert.equal((await validator.verifyGitHubA19CurrentHead(proof, options))?.approvalUrl, review.html_url);
  reviews.push({ ...review, id: 124, state: 'CHANGES_REQUESTED' });
  assert.equal((await validator.verifyGitHubA19CurrentHead(proof, options))?.state, 'PENDING');
  technical.body += '\nsubject to independent confirmation';
  assert.equal(await validator.verifyGitHubA19CurrentHead(proof, options), null);
});

test('joint acceptance preserves the A-19 evidence source through A-09/A-18 finalization', async () => {
  const temp = mkdtempSync(join(tmpdir(), 'risck-joint-gates-'));
  const git = (...args) => execFileSync('git', args, { cwd: temp, encoding: 'utf8' }).trim();
  const indexPath = 'docs/enterprise/evidence/ENTERPRISE_EVIDENCE_MASTER_INDEX.json';
  const combinedPath = 'docs/enterprise/gate-closure-v33/A18_A09_COMBINED_ACCEPTANCE_PROOF.json';
  const index = JSON.parse(readFileSync(indexPath, 'utf8'));
  // This fixture must model standalone A-19 *before* A-09/A-18 admission,
  // regardless of the live ledger's current combined-acceptance state.
  // Otherwise a later legitimate evidence-only index commit causes the
  // standalone regression to fail for the wrong reason.
  for (const gate of index.gates.filter(gate => ['A-09', 'A-18'].includes(gate.gate_id))) {
    gate.accepted = false;
    gate.acceptance_evidence_ref = null;
    gate.acceptance_sha = null;
    gate.acceptance_evidence_sha256 = null;
  }
  const a19 = index.gates.find(gate => gate.gate_id === 'A-19');
  const put = (path, content) => {
    const file = join(temp, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
  };
  const commit = message => {
    git('add', '.');
    git('commit', '-qm', message);
    return git('rev-parse', 'HEAD');
  };
  try {
    git('init', '-q');
    git('config', 'user.email', 'fixture@example.invalid');
    git('config', 'user.name', 'CI fixture');
    put('runtime.txt', 'frozen release\n');
    a19.acceptance_sha = commit('OPS-02 evidence source');
    put(a19.acceptance_evidence_ref, readFileSync(a19.acceptance_evidence_ref));
    put(indexPath, JSON.stringify(index));
    const releaseSource = commit('release source with recorded A-19 decision');
    const joint = structuredClone(index);
    const combined = JSON.parse(readFileSync(combinedPath, 'utf8'));
    for (const id of ['A-09', 'A-18']) {
      combined.gates[id].acceptance_source_sha = releaseSource;
    }
    const combinedBytes = JSON.stringify(combined);
    const digest = createHash('sha256').update(combinedBytes).digest('hex');
    for (const gate of joint.gates.filter(gate => ['A-09', 'A-18'].includes(gate.gate_id))) {
      Object.assign(gate, {
        accepted: true,
        acceptance_sha: releaseSource,
        acceptance_evidence_ref: combinedPath,
        acceptance_evidence_sha256: digest,
      });
    }
    put(combinedPath, combinedBytes);
    put(indexPath, JSON.stringify(joint));
    const finalHead = commit('finalize the combined evidence');
    const options = { expectedSha: finalHead, root: temp };

    assert.equal(validator.sourceCommitIsReviewedAncestor(a19, options), false,
      'historical OPS-02 scope excludes the A-09/A-18 combined proof');
    assert.equal(validator.a19AncestryTarget(joint.gates, options), releaseSource);
    assert.equal(validator.a19AncestryTarget(index.gates, {
      ...options, expectedSha: releaseSource,
    }), releaseSource, 'standalone A-19 keeps its original path');

    const withoutA19 = joint.gates.filter(gate => gate.gate_id !== 'A-19');
    assert.equal(validator.a19AncestryTarget(withoutA19, options), null);
    assert.equal(validator.a19AncestryTarget([...joint.gates, a19], options), null);
    const loneClaim = joint.gates.filter(gate => gate.gate_id !== 'A-18');
    assert.equal(validator.a19AncestryTarget(loneClaim, options), null);
    assert.equal(validator.a19AncestryTarget(joint.gates, { ...options, expectedSha: a19.acceptance_sha }), null);
    const replacedA19 = joint.gates.map(gate => gate.gate_id === 'A-19'
      ? { ...gate, acceptance_evidence_sha256: '0'.repeat(64) }
      : gate);
    assert.equal(validator.a19AncestryTarget(replacedA19, options), null);

    put(a19.acceptance_evidence_ref, '{}');
    assert.equal(validator.a19AncestryTarget(joint.gates, { ...options, expectedSha: commit('alter OPS-02 proof') }), null);
    git('reset', '--hard', finalHead);
    put('runtime.txt', 'unreviewed runtime change\n');
    const changedMerge = commit('unreviewed runtime change');
    assert.equal(validator.a19AncestryTarget(joint.gates, { ...options, expectedSha: changedMerge }), null);

    const proof = JSON.parse(readFileSync(a19.acceptance_evidence_ref, 'utf8'));
    const repo = { full_name: 'renanescola40-afk/eurocomply_saas' };
    const pull = {
      state: 'closed', number: 42, head: { sha: finalHead, repo },
      base: { ref: 'main', repo }, user: { login: 'renanescola40-afk' },
      merged_at: '2026-11-14T12:30:00Z', merge_commit_sha: changedMerge,
    };
    const requested = [];
    const request = async url => {
      requested.push(url);
      return { ok: true, json: async () => [pull] };
    };
    assert.equal(await validator.verifyGitHubA19CurrentHead(proof, {
      expectedSha: changedMerge, jointReleaseSource: releaseSource, root: temp, token: 'test', request,
    }), null);
    assert.deepEqual(requested, [
      'https://api.github.com/repos/' + repo.full_name + '/commits/' + changedMerge + '/pulls?per_page=100',
    ], 'mismatched merge tree fails before old evidence or reviews can be admitted');
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
