import 'server-only';

import {
  getLinkedInAccessTokenCredential,
  type LinkedInCredentialSource,
} from '@/lib/marketing/linkedin-credentials';
import {
  getLinkedInOrganizationVanityName,
  isValidLinkedInOrganizationUrn,
  resolveLinkedInOrganizationUrn,
  type LinkedInOrganizationResolution,
} from '@/lib/marketing/linkedin-organization';

const LINKEDIN_INTROSPECTION_ENDPOINT = 'https://www.linkedin.com/oauth/v2/introspectToken';
const LINKEDIN_POSTS_ENDPOINT = 'https://api.linkedin.com/rest/posts';

export const LINKEDIN_MARKETING_REQUIRED_SCOPES = [
  'r_organization_social',
  'w_organization_social',
] as const;

type LinkedInConnectionConfiguration = {
  accessTokenConfigured: boolean;
  accessTokenSource: LinkedInCredentialSource | null;
  clientIdConfigured: boolean;
  clientSecretConfigured: boolean;
  organizationUrnConfigured: boolean;
  organizationUrnValid: boolean;
  organizationVanityName: string;
  apiVersionConfigured: boolean;
  apiVersionValid: boolean;
};

export type LinkedInTokenInspection = {
  checked: boolean;
  active: boolean;
  status: string | null;
  authType: string | null;
  expiresAt: number | null;
  scopes: string[];
  hasRequiredScopes: boolean;
  httpStatus: number | null;
};

type LinkedInOrganizationReadProbe = {
  checked: boolean;
  ok: boolean;
  httpStatus: number | null;
};

type LinkedInOrganizationResolutionProbe = Omit<LinkedInOrganizationResolution, 'urn'> & {
  resolved: boolean;
};

export type LinkedInMarketingConnectionInspection = {
  configuration: LinkedInConnectionConfiguration;
  token: LinkedInTokenInspection | null;
  organizationResolution: LinkedInOrganizationResolutionProbe | null;
  organizationRead: LinkedInOrganizationReadProbe | null;
  requiredScopes: readonly string[];
  readyForControlledTest: boolean;
};

function optionalEnv(name: string) {
  const value = process.env[name]?.trim();
  return value || null;
}

function isValidApiVersion(value: string | null) {
  return Boolean(value && /^\d{6}$/.test(value));
}

function parseScopes(value: unknown) {
  if (typeof value !== 'string') return [];

  return Array.from(
    new Set(
      value
        .split(/[\s,]+/)
        .map((scope) => scope.trim())
        .filter(Boolean),
    ),
  ).sort();
}

function stringOrNull(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function numberOrNull(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function requiredScopesPresent(scopes: string[]) {
  return LINKEDIN_MARKETING_REQUIRED_SCOPES.every((scope) => scopes.includes(scope));
}

function connectionConfiguration(
  accessTokenConfigured: boolean,
  accessTokenSource: LinkedInCredentialSource | null,
): LinkedInConnectionConfiguration {
  const clientId = optionalEnv('LINKEDIN_CLIENT_ID');
  const clientSecret = optionalEnv('LINKEDIN_CLIENT_SECRET');
  const organizationUrn = optionalEnv('LINKEDIN_ORGANIZATION_URN');
  const apiVersion = optionalEnv('LINKEDIN_API_VERSION');

  return {
    accessTokenConfigured,
    accessTokenSource,
    clientIdConfigured: Boolean(clientId),
    clientSecretConfigured: Boolean(clientSecret),
    organizationUrnConfigured: Boolean(organizationUrn),
    organizationUrnValid: organizationUrn ? isValidLinkedInOrganizationUrn(organizationUrn) : false,
    organizationVanityName: getLinkedInOrganizationVanityName(),
    apiVersionConfigured: Boolean(apiVersion),
    apiVersionValid: isValidApiVersion(apiVersion),
  };
}

export async function inspectLinkedInAccessToken(
  accessToken: string,
  clientId: string,
  clientSecret: string,
): Promise<LinkedInTokenInspection> {
  let response: Response;
  try {
    response = await fetch(LINKEDIN_INTROSPECTION_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        token: accessToken,
      }),
      cache: 'no-store',
    });
  } catch {
    return {
      checked: false,
      active: false,
      status: 'network_unavailable',
      authType: null,
      expiresAt: null,
      scopes: [],
      hasRequiredScopes: false,
      httpStatus: null,
    };
  }

  if (!response.ok) {
    return {
      checked: true,
      active: false,
      status: 'introspection_rejected',
      authType: null,
      expiresAt: null,
      scopes: [],
      hasRequiredScopes: false,
      httpStatus: response.status,
    };
  }

  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  const scopes = parseScopes(payload?.scope);

  return {
    checked: true,
    active: payload?.active === true,
    status: stringOrNull(payload?.status),
    authType: stringOrNull(payload?.auth_type),
    expiresAt: numberOrNull(payload?.expires_at),
    scopes,
    hasRequiredScopes: requiredScopesPresent(scopes),
    httpStatus: response.status,
  };
}

async function probeOrganizationReadAccess(
  accessToken: string,
  organizationUrn: string,
  apiVersion: string,
): Promise<LinkedInOrganizationReadProbe> {
  const url = new URL(LINKEDIN_POSTS_ENDPOINT);
  url.searchParams.set('author', organizationUrn);
  url.searchParams.set('q', 'author');
  url.searchParams.set('count', '1');
  url.searchParams.set('sortBy', 'LAST_MODIFIED');

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'LinkedIn-Version': apiVersion,
        'X-Restli-Protocol-Version': '2.0.0',
        'X-RestLi-Method': 'FINDER',
      },
      cache: 'no-store',
    });
  } catch {
    return { checked: false, ok: false, httpStatus: null };
  }

  return {
    checked: true,
    ok: response.ok,
    httpStatus: response.status,
  };
}

function redactOrganizationResolution(
  resolution: LinkedInOrganizationResolution,
): LinkedInOrganizationResolutionProbe {
  return {
    ok: resolution.ok,
    resolved: Boolean(resolution.urn),
    source: resolution.source,
    vanityName: resolution.vanityName,
    checked: resolution.checked,
    httpStatus: resolution.httpStatus,
    errorCode: resolution.errorCode,
  };
}

export async function inspectLinkedInMarketingConnection(): Promise<LinkedInMarketingConnectionInspection> {
  const credential = await getLinkedInAccessTokenCredential();
  const configuration = connectionConfiguration(Boolean(credential), credential?.source ?? null);
  const clientId = optionalEnv('LINKEDIN_CLIENT_ID');
  const clientSecret = optionalEnv('LINKEDIN_CLIENT_SECRET');
  const organizationUrn = optionalEnv('LINKEDIN_ORGANIZATION_URN');
  const apiVersion = optionalEnv('LINKEDIN_API_VERSION');

  if (!credential || !clientId || !clientSecret) {
    return {
      configuration,
      token: null,
      organizationResolution: null,
      organizationRead: null,
      requiredScopes: LINKEDIN_MARKETING_REQUIRED_SCOPES,
      readyForControlledTest: false,
    };
  }

  const accessToken = credential.token;
  const token = await inspectLinkedInAccessToken(accessToken, clientId, clientSecret);

  let organizationResolution: LinkedInOrganizationResolution | null = null;
  let organizationRead: LinkedInOrganizationReadProbe | null = null;
  if (
    token.active
    && token.hasRequiredScopes
    && apiVersion
    && isValidApiVersion(apiVersion)
  ) {
    organizationResolution = await resolveLinkedInOrganizationUrn({
      accessToken,
      apiVersion,
      configuredUrn: organizationUrn,
      vanityName: process.env.LINKEDIN_ORGANIZATION_VANITY_NAME,
    });

    if (organizationResolution.ok && organizationResolution.urn) {
      organizationRead = await probeOrganizationReadAccess(
        accessToken,
        organizationResolution.urn,
        apiVersion,
      );
    }
  }

  return {
    configuration,
    token,
    organizationResolution: organizationResolution
      ? redactOrganizationResolution(organizationResolution)
      : null,
    organizationRead,
    requiredScopes: LINKEDIN_MARKETING_REQUIRED_SCOPES,
    readyForControlledTest: Boolean(
      token.active
      && token.hasRequiredScopes
      && organizationResolution?.ok
      && organizationResolution?.urn
      && organizationRead?.ok
      && configuration.apiVersionValid,
    ),
  };
}
