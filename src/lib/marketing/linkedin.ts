import 'server-only';

const LINKEDIN_POSTS_ENDPOINT = 'https://api.linkedin.com/rest/posts';

export type LinkedInOrganizationPostInput = {
  text: string;
  organizationUrn?: string;
};

export type LinkedInOrganizationPostResult = {
  postId: string | null;
};

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function getOrganizationUrn(explicit?: string) {
  const value = explicit?.trim() || requireEnv('LINKEDIN_ORGANIZATION_URN');
  if (!/^urn:li:organization:\d+$/.test(value)) {
    throw new Error('LINKEDIN_ORGANIZATION_URN must be a LinkedIn organization URN');
  }
  return value;
}

function getLinkedInApiVersion() {
  const value = requireEnv('LINKEDIN_API_VERSION');
  if (!/^\d{6}$/.test(value)) {
    throw new Error('LINKEDIN_API_VERSION must use YYYYMM format');
  }
  return value;
}

export async function publishLinkedInOrganizationTextPost(
  input: LinkedInOrganizationPostInput,
): Promise<LinkedInOrganizationPostResult> {
  const commentary = input.text.trim();
  if (!commentary) throw new Error('LinkedIn post text is required');
  if (commentary.length > 3000) throw new Error('LinkedIn post text exceeds the 3000 character limit');

  const accessToken = requireEnv('LINKEDIN_ACCESS_TOKEN');
  const linkedinVersion = getLinkedInApiVersion();
  const author = getOrganizationUrn(input.organizationUrn);

  const response = await fetch(LINKEDIN_POSTS_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': linkedinVersion,
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author,
      commentary,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`LinkedIn publish failed with upstream status ${response.status}`);
  }

  return {
    postId: response.headers.get('x-restli-id'),
  };
}
