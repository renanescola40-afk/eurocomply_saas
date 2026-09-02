import 'server-only';

import { getLinkedInAccessTokenCredential } from '@/lib/marketing/linkedin-credentials';
import { resolveLinkedInOrganizationUrn } from '@/lib/marketing/linkedin-organization';

const LINKEDIN_POSTS_ENDPOINT = 'https://api.linkedin.com/rest/posts';

export type LinkedInOrganizationPostInput = {
  text: string;
  organizationUrn?: string;
};

export type LinkedInOrganizationPostResult = {
  postId: string | null;
};

export type LinkedInPublishFailureKind =
  | 'configuration'
  | 'organization_resolution'
  | 'upstream_rejected'
  | 'network_uncertain';

export class LinkedInPublishError extends Error {
  readonly kind: LinkedInPublishFailureKind;
  readonly status: number | null;

  constructor(kind: LinkedInPublishFailureKind, message: string, status: number | null = null) {
    super(message);
    this.name = 'LinkedInPublishError';
    this.kind = kind;
    this.status = status;
  }
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new LinkedInPublishError('configuration', `${name} is not configured`);
  }
  return value;
}

function getLinkedInApiVersion() {
  const value = requireEnv('LINKEDIN_API_VERSION');
  if (!/^\d{6}$/.test(value)) {
    throw new LinkedInPublishError('configuration', 'LINKEDIN_API_VERSION must use YYYYMM format');
  }
  return value;
}

export async function publishLinkedInOrganizationTextPost(
  input: LinkedInOrganizationPostInput,
): Promise<LinkedInOrganizationPostResult> {
  const commentary = input.text.trim();
  if (!commentary) {
    throw new LinkedInPublishError('configuration', 'LinkedIn post text is required');
  }
  if (commentary.length > 3000) {
    throw new LinkedInPublishError(
      'configuration',
      'LinkedIn post text exceeds the 3000 character limit',
    );
  }

  const credential = await getLinkedInAccessTokenCredential();
  if (!credential) {
    throw new LinkedInPublishError('configuration', 'LinkedIn access token is not configured');
  }

  const accessToken = credential.token;
  const linkedinVersion = getLinkedInApiVersion();
  const organization = await resolveLinkedInOrganizationUrn({
    accessToken,
    apiVersion: linkedinVersion,
    explicitUrn: input.organizationUrn,
    configuredUrn: process.env.LINKEDIN_ORGANIZATION_URN,
    vanityName: process.env.LINKEDIN_ORGANIZATION_VANITY_NAME,
  });

  if (!organization.ok || !organization.urn) {
    throw new LinkedInPublishError(
      'organization_resolution',
      `LinkedIn organization resolution failed (${organization.errorCode ?? 'unknown'})`,
      organization.httpStatus,
    );
  }

  let response: Response;
  try {
    response = await fetch(LINKEDIN_POSTS_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': linkedinVersion,
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        author: organization.urn,
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
  } catch {
    throw new LinkedInPublishError(
      'network_uncertain',
      'LinkedIn publish request failed with an uncertain network outcome',
    );
  }

  if (!response.ok) {
    throw new LinkedInPublishError(
      'upstream_rejected',
      `LinkedIn publish failed with upstream status ${response.status}`,
      response.status,
    );
  }

  return {
    postId: response.headers.get('x-restli-id'),
  };
}
