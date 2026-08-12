import { pathToFileURL } from 'node:url';

export function validateGitHubEnvironmentGovernance(environment, {
  expectedName,
  requireProtectedBranches = true,
} = {}) {
  const failures = [];

  if (!environment || typeof environment !== 'object') {
    return ['GitHub deployment environment response is missing or invalid'];
  }

  if (!expectedName || typeof expectedName !== 'string') {
    failures.push('expected environment name is required');
  } else if (String(environment.name ?? '').toLowerCase() !== expectedName.toLowerCase()) {
    failures.push(`environment name must be ${expectedName}`);
  }

  if (environment.can_admins_bypass !== false) {
    failures.push('administrator bypass must be disabled');
  }

  const reviewerRule = Array.isArray(environment.protection_rules)
    ? environment.protection_rules.find((rule) => rule?.type === 'required_reviewers')
    : undefined;
  const reviewers = Array.isArray(reviewerRule?.reviewers) ? reviewerRule.reviewers : [];
  if (reviewers.length < 1) {
    failures.push('at least one required deployment reviewer must be configured');
  }

  if (requireProtectedBranches) {
    const policy = environment.deployment_branch_policy;
    if (!policy || policy.protected_branches !== true || policy.custom_branch_policies !== false) {
      failures.push('deployment branch policy must allow protected branches only');
    }
  }

  return failures;
}

export async function getGitHubEnvironment({
  repository,
  environmentName,
  token,
  apiUrl = 'https://api.github.com',
  fetchImpl = fetch,
}) {
  if (!repository || !repository.includes('/')) {
    throw new Error('GITHUB_REPOSITORY must be owner/repository');
  }
  if (!environmentName) {
    throw new Error('GITHUB_ENVIRONMENT_NAME is required');
  }
  if (!token) {
    throw new Error('GITHUB_TOKEN is required');
  }

  const endpoint = `${apiUrl.replace(/\/$/, '')}/repos/${repository}/environments/${encodeURIComponent(environmentName)}`;
  const response = await fetchImpl(endpoint, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (response.status === 404) {
    throw new Error(`GitHub deployment environment ${environmentName} does not exist`);
  }
  if (!response.ok) {
    throw new Error(`GitHub environment governance lookup failed with HTTP ${response.status}`);
  }

  return response.json();
}

export async function runGitHubEnvironmentGovernanceCheck(env = process.env) {
  const expectedName = env.GITHUB_ENVIRONMENT_NAME;
  const environment = await getGitHubEnvironment({
    repository: env.GITHUB_REPOSITORY,
    environmentName: expectedName,
    token: env.GITHUB_TOKEN,
    apiUrl: env.GITHUB_API_URL || 'https://api.github.com',
  });
  const failures = validateGitHubEnvironmentGovernance(environment, {
    expectedName,
    requireProtectedBranches: env.REQUIRE_PROTECTED_BRANCHES !== 'false',
  });

  console.log('RISCK COMPLY GitHub environment governance check');
  console.log('--------------------------------------------------');
  console.log(`Environment: ${expectedName}`);

  if (failures.length > 0) {
    console.error('Environment governance failures:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return false;
  }

  console.log('Environment exists, administrator bypass is disabled, a required reviewer is configured, and deployment is restricted to protected branches.');
  return true;
}

const invokedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  runGitHubEnvironmentGovernanceCheck().catch((error) => {
    console.error(`GitHub environment governance check failed: ${error.message}`);
    process.exitCode = 1;
  });
}
