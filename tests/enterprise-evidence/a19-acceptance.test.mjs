import test from 'node:test';
import assert from 'node:assert/strict';
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
  const options = { expectedSha: head, prNumber: 42, token: 'test', request };
  assert.equal((await validator.verifyGitHubA19CurrentHead(proof, options))?.state, 'PENDING');
  reviews = [{ ...review, commit_id: source }];
  assert.equal((await validator.verifyGitHubA19CurrentHead(proof, options))?.state, 'PENDING');
  reviews = [review];
  assert.equal((await validator.verifyGitHubA19CurrentHead(proof, options))?.approvalUrl, review.html_url);
  reviews.push({ ...review, id: 124, state: 'CHANGES_REQUESTED' });
  assert.equal((await validator.verifyGitHubA19CurrentHead(proof, options))?.state, 'PENDING');
  technical.body += '\nsubject to independent confirmation';
  assert.equal(await validator.verifyGitHubA19CurrentHead(proof, options), null);
});
