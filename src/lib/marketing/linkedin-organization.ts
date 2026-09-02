import 'server-only';

const LINKEDIN_ORGANIZATION_LOOKUP_ENDPOINT = 'https://api.linkedin.com/rest/organization';
const ORGANIZATION_URN_PATTERN = /^urn:li:organization:\d+$/;
const VANITY_NAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?$/;

export const DEFAULT_LINKEDIN_ORGANIZATION_VANITY_NAME = 'risck-comply';

export type LinkedInOrganizationResolutionSource =
  | 'explicit_urn'
  | 'configured_urn'
  | 'vanity_lookup';

export type LinkedInOrganizationResolution = {
  ok: boolean;
  urn: string | null;
  source: LinkedInOrganizationResolutionSource | null;
  vanityName: string;
  checked: boolean;
  httpStatus: number | null;
  errorCode: 'invalid_urn' | 'invalid_vanity_name' | 'lookup_unavailable' | 'lookup_rejected' | 'lookup_mismatch' | null;
};

type ResolveLinkedInOrganizationInput = {
  accessToken: string;
  apiVersion: string;
  explicitUrn?: string | null;
  configuredUrn?: string | null;
  vanityName?: string | null;
};

function normalize(value: string | null | undefined) {
  return value?.trim() || null;
}

export function isValidLinkedInOrganizationUrn(value: string | null | undefined) {
  return Boolean(value && ORGANIZATION_URN_PATTERN.test(value));
}

export function getLinkedInOrganizationVanityName(value?: string | null) {
  return normalize(value)
    || normalize(process.env.LINKEDIN_ORGANIZATION_VANITY_NAME)
    || DEFAULT_LINKEDIN_ORGANIZATION_VANITY_NAME;
}

function parseOrganizationLookup(payload: unknown, vanityName: string) {
  const normalizedVanity = vanityName.toLowerCase();
  const candidates: unknown[] = [];

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    candidates.push(record);

    if (Array.isArray(record.elements)) candidates.push(...record.elements);
    if (record.results && typeof record.results === 'object') {
      candidates.push(...Object.values(record.results as Record<string, unknown>));
    }
  }

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue;
    const row = candidate as Record<string, unknown>;
    const candidateVanity = typeof row.vanityName === 'string' ? row.vanityName.trim().toLowerCase() : null;
    const id = typeof row.id === 'number'
      ? row.id
      : typeof row.id === 'string' && /^\d+$/.test(row.id)
        ? Number(row.id)
        : null;

    if (candidateVanity !== normalizedVanity || !Number.isSafeInteger(id) || Number(id) <= 0) continue;
    return `urn:li:organization:${id}`;
  }

  return null;
}

export async function resolveLinkedInOrganizationUrn(
  input: ResolveLinkedInOrganizationInput,
): Promise<LinkedInOrganizationResolution> {
  const explicitUrn = normalize(input.explicitUrn);
  if (explicitUrn) {
    if (!isValidLinkedInOrganizationUrn(explicitUrn)) {
      return {
        ok: false,
        urn: null,
        source: 'explicit_urn',
        vanityName: getLinkedInOrganizationVanityName(input.vanityName),
        checked: false,
        httpStatus: null,
        errorCode: 'invalid_urn',
      };
    }

    return {
      ok: true,
      urn: explicitUrn,
      source: 'explicit_urn',
      vanityName: getLinkedInOrganizationVanityName(input.vanityName),
      checked: false,
      httpStatus: null,
      errorCode: null,
    };
  }

  const configuredUrn = normalize(input.configuredUrn);
  if (configuredUrn) {
    if (!isValidLinkedInOrganizationUrn(configuredUrn)) {
      return {
        ok: false,
        urn: null,
        source: 'configured_urn',
        vanityName: getLinkedInOrganizationVanityName(input.vanityName),
        checked: false,
        httpStatus: null,
        errorCode: 'invalid_urn',
      };
    }

    return {
      ok: true,
      urn: configuredUrn,
      source: 'configured_urn',
      vanityName: getLinkedInOrganizationVanityName(input.vanityName),
      checked: false,
      httpStatus: null,
      errorCode: null,
    };
  }

  const vanityName = getLinkedInOrganizationVanityName(input.vanityName);
  if (!VANITY_NAME_PATTERN.test(vanityName)) {
    return {
      ok: false,
      urn: null,
      source: 'vanity_lookup',
      vanityName,
      checked: false,
      httpStatus: null,
      errorCode: 'invalid_vanity_name',
    };
  }

  const url = new URL(LINKEDIN_ORGANIZATION_LOOKUP_ENDPOINT);
  url.searchParams.set('q', 'vanityName');
  url.searchParams.set('vanityName', vanityName);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'LinkedIn-Version': input.apiVersion,
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
  } catch {
    return {
      ok: false,
      urn: null,
      source: 'vanity_lookup',
      vanityName,
      checked: false,
      httpStatus: null,
      errorCode: 'lookup_unavailable',
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      urn: null,
      source: 'vanity_lookup',
      vanityName,
      checked: true,
      httpStatus: response.status,
      errorCode: 'lookup_rejected',
    };
  }

  const payload = await response.json().catch(() => null);
  const urn = parseOrganizationLookup(payload, vanityName);
  if (!urn) {
    return {
      ok: false,
      urn: null,
      source: 'vanity_lookup',
      vanityName,
      checked: true,
      httpStatus: response.status,
      errorCode: 'lookup_mismatch',
    };
  }

  return {
    ok: true,
    urn,
    source: 'vanity_lookup',
    vanityName,
    checked: true,
    httpStatus: response.status,
    errorCode: null,
  };
}
