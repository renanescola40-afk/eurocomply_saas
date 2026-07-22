import { pbkdf2Sync, randomBytes } from 'node:crypto';

import { createAdminClient } from '@/lib/supabase/admin';
import { resolveEnterpriseEntitlements } from '@/server/enterprise/licensing';
import { verifyStoredSecret } from '@/server/enterprise-integrations/security';

const API_KEY_PREFIX = 'rc_live_';
const API_TOKEN_PATTERN = /^(rc_live_[a-f0-9]{8})\.([A-Za-z0-9_-]{32,128})$/;
const SECRET_KDF_ALGORITHM = 'sha256';
const SECRET_KDF_ITERATIONS = 210000;
const SECRET_KDF_KEYLEN = 32;

export type EnterpriseApiAccess = {
  keyId: string;
  keyPrefix: string;
  organizationId: string;
  serviceAccountId: string;
  actorUserId: string;
  scopes: string[];
};

export class EnterpriseApiAccessError extends Error {
  status: 401 | 403 | 429 | 503;
  code:
    | 'enterprise_api_key_required'
    | 'enterprise_api_key_invalid'
    | 'enterprise_api_key_expired'
    | 'enterprise_api_scope_required'
    | 'enterprise_api_not_entitled'
    | 'enterprise_api_unavailable';

  constructor(code: EnterpriseApiAccessError['code'], status: EnterpriseApiAccessError['status']) {
    super(code);
    this.name = 'EnterpriseApiAccessError';
    this.code = code;
    this.status = status;
  }
}

type ApiKeyRow = {
  id?: unknown;
  organization_id?: unknown;
  service_account_id?: unknown;
  secret_hash?: unknown;
  scopes?: unknown;
  status?: unknown;
  expires_at?: unknown;
  created_by?: unknown;
};

type ServiceAccountRow = { status?: unknown };

type RpcClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { code?: string } | null }>;
};

type CredentialRow = {
  outcome?: unknown;
  organization_id?: unknown;
  service_account_id?: unknown;
  api_key_id?: unknown;
  key_prefix?: unknown;
  expires_at?: unknown;
};

function stringField(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function firstRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] as T | undefined) ?? null;
  return data && typeof data === 'object' ? (data as T) : null;
}

function createSecretVerifier(secret: string) {
  const salt = randomBytes(16).toString('hex');
  const derived = pbkdf2Sync(
    secret,
    salt,
    SECRET_KDF_ITERATIONS,
    SECRET_KDF_KEYLEN,
    SECRET_KDF_ALGORITHM,
  ).toString('hex');
  return `pbkdf2$${SECRET_KDF_ITERATIONS}$${salt}$${derived}`;
}

export function issueConstraintSafeEnterpriseApiKey() {
  const prefix = `${API_KEY_PREFIX}${randomBytes(4).toString('hex')}`;
  const plaintext = `${prefix}.${randomBytes(32).toString('base64url')}`;
  return { plaintext, prefix, verifier: createSecretVerifier(plaintext) };
}

export async function createEnterpriseApiCredential(input: {
  organizationId: string;
  serviceAccountName: string;
  serviceAccountDescription?: string | null;
  scopes: string[];
  expiresAt: string;
  actorUserId: string;
}) {
  const credential = issueConstraintSafeEnterpriseApiKey();
  const client = createAdminClient() as unknown as RpcClient;
  const { data, error } = await client.rpc('create_enterprise_api_credential_atomic', {
    p_organization_id: input.organizationId,
    p_service_account_name: input.serviceAccountName,
    p_service_account_description: input.serviceAccountDescription ?? null,
    p_key_prefix: credential.prefix,
    p_secret_verifier: credential.verifier,
    p_scopes: input.scopes,
    p_expires_at: input.expiresAt,
    p_actor_user_id: input.actorUserId,
  });

  if (error) throw new EnterpriseApiAccessError('enterprise_api_unavailable', 503);
  const row = firstRow<CredentialRow>(data);
  const outcome = typeof row?.outcome === 'string' ? row.outcome : 'unavailable';
  if (outcome === 'platform_role_required') {
    throw new EnterpriseApiAccessError('enterprise_api_scope_required', 403);
  }
  if (outcome === 'api_not_entitled') {
    throw new EnterpriseApiAccessError('enterprise_api_not_entitled', 403);
  }
  if (outcome !== 'created') {
    throw new EnterpriseApiAccessError('enterprise_api_unavailable', 503);
  }

  const keyId = stringField(row?.api_key_id);
  const serviceAccountId = stringField(row?.service_account_id);
  const organizationId = stringField(row?.organization_id);
  const expiresAt = stringField(row?.expires_at);
  if (!keyId || !serviceAccountId || !organizationId || !expiresAt) {
    throw new EnterpriseApiAccessError('enterprise_api_unavailable', 503);
  }

  return {
    token: credential.plaintext,
    prefix: credential.prefix,
    keyId,
    serviceAccountId,
    organizationId,
    expiresAt,
  };
}

function bearerToken(request: Request) {
  const authorization = request.headers.get('authorization')?.trim() ?? '';
  if (!authorization.toLowerCase().startsWith('bearer ')) return null;
  const token = authorization.slice(7).trim();
  return API_TOKEN_PATTERN.test(token) ? token : null;
}

export async function requireEnterpriseApiAccess(
  request: Request,
  requiredScope: string,
): Promise<EnterpriseApiAccess> {
  const token = bearerToken(request);
  if (!token) throw new EnterpriseApiAccessError('enterprise_api_key_required', 401);
  const parsed = API_TOKEN_PATTERN.exec(token);
  if (!parsed) throw new EnterpriseApiAccessError('enterprise_api_key_invalid', 401);
  const prefix = parsed[1];

  const admin = createAdminClient();
  const { data: keyData, error: keyError } = await admin
    .from('enterprise_api_keys')
    .select('id, organization_id, service_account_id, secret_hash, scopes, status, expires_at, created_by')
    .eq('key_prefix', prefix)
    .maybeSingle();

  if (keyError) throw new EnterpriseApiAccessError('enterprise_api_unavailable', 503);
  const key = (keyData ?? null) as ApiKeyRow | null;
  if (!key || key.status !== 'active') {
    throw new EnterpriseApiAccessError('enterprise_api_key_invalid', 401);
  }

  const expiresAt = stringField(key.expires_at);
  if (!expiresAt || Date.parse(expiresAt) <= Date.now()) {
    throw new EnterpriseApiAccessError('enterprise_api_key_expired', 401);
  }

  const verifier = stringField(key.secret_hash);
  if (!verifier || !verifyStoredSecret(token, verifier)) {
    throw new EnterpriseApiAccessError('enterprise_api_key_invalid', 401);
  }

  const scopes = Array.isArray(key.scopes)
    ? key.scopes.filter((scope): scope is string => typeof scope === 'string')
    : [];
  if (!scopes.includes(requiredScope)) {
    throw new EnterpriseApiAccessError('enterprise_api_scope_required', 403);
  }

  const serviceAccountId = stringField(key.service_account_id);
  const organizationId = stringField(key.organization_id);
  const keyId = stringField(key.id);
  const actorUserId = stringField(key.created_by);
  if (!serviceAccountId || !organizationId || !keyId || !actorUserId) {
    throw new EnterpriseApiAccessError('enterprise_api_unavailable', 503);
  }

  const { data: accountData, error: accountError } = await admin
    .from('enterprise_service_accounts')
    .select('status')
    .eq('id', serviceAccountId)
    .eq('organization_id', organizationId)
    .maybeSingle();
  const account = (accountData ?? null) as ServiceAccountRow | null;
  if (accountError) throw new EnterpriseApiAccessError('enterprise_api_unavailable', 503);
  if (!account || account.status !== 'active') {
    throw new EnterpriseApiAccessError('enterprise_api_key_invalid', 401);
  }

  const entitlement = await resolveEnterpriseEntitlements(organizationId).catch(() => null);
  if (!entitlement || entitlement.contractStatus !== 'active' || entitlement.features.api !== true) {
    throw new EnterpriseApiAccessError('enterprise_api_not_entitled', 403);
  }

  await admin
    .from('enterprise_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyId)
    .eq('organization_id', organizationId);

  return {
    keyId,
    keyPrefix: prefix,
    organizationId,
    serviceAccountId,
    actorUserId,
    scopes,
  };
}
