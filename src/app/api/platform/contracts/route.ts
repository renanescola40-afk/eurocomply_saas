import { readBoundedJsonRequest } from '@/lib/security/validate';
import {
  createEnterpriseContractSchema,
  provisionEnterpriseContract,
} from '@/server/enterprise/contracts';
import { noStoreJson } from '@/server/security/no-store';
import { requireApiUser, requireTrustedMutation, secureApiError } from '@/server/security/api-guards';
import {
  PlatformAdminError,
  requirePlatformCapability,
} from '@/server/security/platform-admin';

const MAX_CONTRACT_JSON_BYTES = 16 * 1024;

function getClientIp(request: Request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
  );
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const mutationDenied = await requireTrustedMutation(request, {
      rateLimit: {
        key: `platform-contract-create:${user.id}:${getClientIp(request)}`,
        policy: 'general-api',
        userId: user.id,
        action: 'enterprise_contract_create',
        route: '/api/platform/contracts',
        limit: 10,
        windowMs: 60_000,
        failureMode: 'fail-closed',
      },
    });

    if (mutationDenied) return mutationDenied;

    await requirePlatformCapability(user.id, 'contracts');

    const payload = await readBoundedJsonRequest(request, {
      maxBytes: MAX_CONTRACT_JSON_BYTES,
    }).catch(() => null);
    const parsed = createEnterpriseContractSchema.safeParse(payload);

    if (!parsed.success) {
      return noStoreJson({ error: 'invalid_enterprise_contract_payload' }, { status: 400 });
    }

    const result = await provisionEnterpriseContract(parsed.data, user.id);

    if (result.outcome === 'organization_not_found') {
      return noStoreJson({ error: 'organization_not_found' }, { status: 404 });
    }

    if (result.outcome === 'current_contract_exists') {
      return noStoreJson({ error: 'current_enterprise_contract_exists' }, { status: 409 });
    }

    if (result.outcome === 'limits_below_current_usage') {
      return noStoreJson(
        {
          error: 'contract_limits_below_current_usage',
          message: 'The negotiated limits cannot be lower than the organization current active usage.',
        },
        { status: 409 },
      );
    }

    if (result.outcome === 'platform_role_required') {
      return noStoreJson({ error: 'platform_contract_role_required' }, { status: 403 });
    }

    if (result.outcome === 'invalid_input' || result.outcome === 'invalid_contract') {
      return noStoreJson({ error: 'invalid_enterprise_contract_payload' }, { status: 400 });
    }

    if (result.outcome !== 'created' || !result.contractId || !result.organizationId) {
      return noStoreJson({ error: 'enterprise_contract_provisioning_unavailable' }, { status: 503 });
    }

    return noStoreJson(
      {
        created: true,
        contractId: result.contractId,
        organizationId: result.organizationId,
        status: result.contractStatus,
        version: result.version,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof PlatformAdminError) {
      return noStoreJson({ error: error.code }, { status: error.status });
    }
    return secureApiError(error, request);
  }
}
