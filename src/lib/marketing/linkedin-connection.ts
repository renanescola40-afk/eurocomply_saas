import 'server-only';

const LINKEDIN_INTROSPECTION_ENDPOINT = 'https://www.linkedin.com/oauth/v2/introspectToken';
const LINKEDIN_POSTS_ENDPOINT = 'https://api.linkedin.com/rest/posts';

export const LINKEDIN_MARKETING_REQUIRED_SCOPES = [
  'r_organization_social',
  'w_organization_social',
] as const;

type LinkedInConnectionConfiguration = {
  accessTokenConfigured: boolean;
  clientIdConfigured: boolean;
  clientSecretConfigured: boolean;
  organizationUrnConfigured: boolean;
  organizationUrnValid: boolean;
  apiVersionConfigured: boolean;
  apiVersionValid: boolean;
};

type LinkedInTokenInspection = {
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

export type LinkedInMarketingConnectionInspection = {
  configuration: LinkedInConnectionConfiguration;
  token: LinkedInTokenInspection | null;
  organizationRead: LinkedInOrganizationReadProbe | null;
  requiredScopes: readonly string[];
  readyForControlledTest: boolean;
};

function optionalEnv(name: string) {
  const value = process.env[name]?.trim();
  return value || null;
}

function isValidOrganizationUrn(value: string | null) {
  return Boolean(value && /^urn:li:organization:\d+$/.test(value));
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

function connectionConfiguration(): LinkedInConnectionConfiguration {
  const accessToken = optionalEnv('LINKEDIN_ACCESS_TOKEN');
  const clientId = optionalEnv('LINKEDIN_CLIENT_ID');
  const clientSecret = optionalEnv('LINKEDIN_CLIENT_SECRET');
  const organizationUrn = optionalEnv('LINKEDIN_ORGANIZATION_URN');
  const apiVersion = optionalEnv('LINKEDIN_API_VERSION');

  return {
    accessTokenConfigured: Boolean(accessToken),
    clientIdConfigured: Boolean(clientId),
    clientSecretConfigured: Boolean(clientSecret),
    organizationUrnConfigured: Boolean(organizationUrn),
    organizationUrnValid: isValidOrganizationUrn(organizationUrn),
    apiVersionConfigured: Boolean(apiVersion),
    apiVersionValid: isValidApiVersion(apiVersion),
  };
}

async function inspectAccessToken(
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

export async function inspectLinkedInMarketingConnection(): Promise<LinkedInMarketingConnectionInspection> {
  const configuration = connectionConfiguration();
  const accessToken = optionalEnv('LINKEDIN_ACCESS_TOKEN');
  const clientId = optionalEnv('LINKEDIN_CLIENT_ID');
  const clientSecret = optionalEnv('LINKEDIN_CLIENT_SECRET');
  const organizationUrn = optionalEnv('LINKEDIN_ORGANIZATION_URN');
  const apiVersion = optionalEnv('LINKEDIN_API_VERSION');

  if (!accessToken || !clientId || !clientSecret) {
    return {
      configuration,
      token: null,
      organizationRead: null,
      requiredScopes: LINKEDIN_MARKETING_REQUIRED_SCOPES,
      readyForControlledTest: false,
    };
  }

  const token = await inspectAccessToken(accessToken, clientId, clientSecret);

  let organizationRead: LinkedInOrganizationReadProbe | null = null;
  if (
    token.active
    && token.hasRequiredScopes
    && organizationUrn
    && isValidOrganizationUrn(organizationUrn)
    && apiVersion
    && isValidApiVersion(apiVersion)
  ) {
    organizationRead = await probeOrganizationReadAccess(accessToken, organizationUrn, apiVersion);
  }

  return {
    configuration,
    token,
    organizationRead,
    requiredScopes: LINKEDIN_MARKETING_REQUIRED_SCOPES,
    readyForControlledTest: Boolean(
      token.active
      && token.hasRequiredScopes
      && organizationRead?.ok
      && configuration.organizationUrnValid
      && configuration.apiVersionValid,
    ),
  };
}
