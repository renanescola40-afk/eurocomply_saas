#!/usr/bin/env node

const FULL_SHA = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const RUN_ID = /^[1-9][0-9]*$/;
const BRANCH = /^automation\/legal-rules-runtime-[a-f0-9]{12}-[1-9][0-9]*$/;
const REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const CANONICAL_PATH = 'docs/security/evidence/runtime/legal-rules-validation.json';

function required(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function main() {
  const token = required('GITHUB_TOKEN');
  const repository = required('GITHUB_REPOSITORY');
  const assessedSha = required('ASSESSED_SHA').toLowerCase();
  const sourceRunId = required('SOURCE_RUN_ID');
  const artifactSha256 = required('ARTIFACT_SHA256').toLowerCase();
  const canonicalPath = required('CANONICAL_PATH');
  const promotionBranch = required('PROMOTION_BRANCH');
  const promotionCommitSha = required('PROMOTION_COMMIT_SHA').toLowerCase();

  if (repository !== REPOSITORY) throw new Error('promotion repository is not approved');
  if (canonicalPath !== CANONICAL_PATH) throw new Error('promotion canonical path is not approved');
  if (!FULL_SHA.test(assessedSha)) throw new Error('ASSESSED_SHA must be a full lowercase SHA');
  if (!FULL_SHA.test(promotionCommitSha)) throw new Error('PROMOTION_COMMIT_SHA must be a full lowercase SHA');
  if (!SHA256.test(artifactSha256)) throw new Error('ARTIFACT_SHA256 must be a lowercase SHA-256 digest');
  if (!RUN_ID.test(sourceRunId)) throw new Error('SOURCE_RUN_ID must be a positive integer');
  if (!BRANCH.test(promotionBranch)) throw new Error('PROMOTION_BRANCH is outside the approved namespace');
  const expectedBranch = `automation/legal-rules-runtime-${assessedSha.slice(0, 12)}-${sourceRunId}`;
  if (promotionBranch !== expectedBranch) throw new Error('promotion branch does not match the assessed SHA and source run');

  const [owner, repo] = repository.split('/');
  const apiBase = `https://api.github.com/repos/${owner}/${repo}`;

  async function api(path, { method = 'GET', body } = {}) {
    const response = await fetch(`${apiBase}${path}`, {
      method,
      redirect: 'error',
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'user-agent': 'risck-comply-legal-rules-runtime-promotion/2.0',
        'x-github-api-version': '2022-11-28',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`GitHub API ${method} ${path} failed with HTTP ${response.status}`);
    return response.status === 204 ? null : response.json();
  }

  const mainCommit = await api('/commits/main');
  if (mainCommit?.sha !== assessedSha) throw new Error('assessed SHA is no longer current main');

  const comparison = await api(`/compare/${assessedSha}...${promotionCommitSha}`);
  if (comparison?.status !== 'ahead' || comparison?.ahead_by !== 1 || comparison?.behind_by !== 0) {
    throw new Error('promotion commit must be exactly one commit ahead of assessed main');
  }
  if (comparison?.base_commit?.sha !== assessedSha || comparison?.merge_base_commit?.sha !== assessedSha) {
    throw new Error('promotion commit is not based on the assessed main SHA');
  }
  if (!Array.isArray(comparison?.commits) || comparison.commits.length !== 1 || comparison.commits[0]?.sha !== promotionCommitSha) {
    throw new Error('promotion comparison does not contain the expected single commit');
  }
  if (!Array.isArray(comparison?.files) || comparison.files.length !== 1) {
    throw new Error('promotion commit must change exactly one file');
  }
  const [changedFile] = comparison.files;
  if (changedFile?.filename !== canonicalPath || changedFile?.status !== 'modified' || changedFile?.previous_filename) {
    throw new Error('promotion commit changes an unapproved path or file status');
  }

  const headQuery = encodeURIComponent(`${owner}:${promotionBranch}`);
  const existingPulls = await api(`/pulls?state=open&base=main&head=${headQuery}&per_page=10`);
  let pull = Array.isArray(existingPulls) ? existingPulls[0] : null;
  let status = 'REUSED_DRAFT_PR';

  if (pull) {
    if (pull.head?.sha !== promotionCommitSha || pull.head?.ref !== promotionBranch || pull.base?.ref !== 'main') {
      throw new Error('existing promotion pull request does not match the validated branch commit');
    }
  } else {
    pull = await api('/pulls', {
      method: 'POST',
      body: {
        title: `Promote legal-rules runtime evidence for ${assessedSha.slice(0, 12)}`,
        head: promotionBranch,
        base: 'main',
        draft: true,
        maintainer_can_modify: false,
        body: [
          '## Objective',
          '',
          'Promote the authenticated legal-rules runtime artifact produced for the exact current `main` deployment.',
          '',
          '## Provenance',
          '',
          `- assessed SHA: \`${assessedSha}\`;`,
          `- source workflow run: \`${sourceRunId}\`;`,
          `- promotion commit: \`${promotionCommitSha}\`;`,
          `- artifact SHA-256: \`${artifactSha256}\`;`,
          `- canonical path: \`${canonicalPath}\`.`,
          '',
          '## Trust boundary',
          '',
          '- The source artifact was validated read-only before repository write permissions were used.',
          '- Artifact bytes were committed through an isolated single-file Git branch and were not forwarded by the PR API client.',
          '- GitHub compare confirms one commit and one modified canonical evidence file.',
          '- Final review and merge remain human-controlled.',
          '',
          '## Evidence boundary',
          '',
          'This artifact proves deployed behavior for the versioned legal-rules engine. It does not prove legal compliance, customer-specific applicability, regulator acceptance, completed qualified legal review or full production readiness.',
        ].join('\n'),
      },
    });
    status = 'CREATED_DRAFT_PR';
  }

  if (!Number.isInteger(pull?.number) || typeof pull?.html_url !== 'string') {
    throw new Error('promotion pull request metadata is missing');
  }

  process.stdout.write(`${JSON.stringify({
    status,
    assessedSha,
    sourceRunId,
    branch: promotionBranch,
    promotionCommitSha,
    pullRequestNumber: pull.number,
    pullRequestUrl: pull.html_url,
    artifactSha256,
    canonicalPath,
  }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
