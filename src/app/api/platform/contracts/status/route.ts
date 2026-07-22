import { readBoundedJsonRequest } from '@/lib/security/validate';
import {
  transitionEnterpriseContract,
  transitionEnterpriseContractSchema,
} from '@/server/enterprise/contracts';
import { noStoreJson } from '@/server/security/no-store';
import { requireApiUser, requireTrustedMutation, secureApiError } from '@/server/security/api-guards';
import {
  PlatformAdminError,
  requirePlatformCapability,
} from '@/server/security/platform-admin';

const MAX_STATUS_JSON_BYTES = 4 * 1024;

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
        key: `platform-contract-status:${user.id}:${getClientIp(request)}`,
        policy: 'general-api',
        userId: user.id,
        action: 'enterprise_contract_status_change',
        route: '/api/platform/contracts/status',
        limit: 20,
        windowMs: 60_000,
        failureMode: 'fail-closed',
      },
    });

    if (mutationDenied) return mutationDenied;

    await requirePlatformCapability(user.id, 'contracts');

    const payload = await readBoundedJsonRequest(request, {
      maxBytes: MAX_STATUS_JSON_BYTES,
    }).catch(() => null);
    const parsed = transitionEnterpriseContractSchema.safeParse(payload);

    if (!parsed.success) {
      return noStoreJson({ error: 'invalid_contract_transition_payload' }, { status: 400 });
    }

    const result = await transitionEnterpriseContract(parsed.data, user.id);

    if (result.outcome === 'not_found') {
      return noStoreJson({ error: 'enterprise_contract_not_found' }, { status: 404 });
    }

    if (result.outcome === 'state_changed') {
      return noStoreJson(
        { error: 'enterprise_contract_state_changed', currentStatus: result.previousStatus },
        { status: 409 },
      );
    }

    if (result.outcome === 'invalid_transition') {
      return noStoreJson(
        {
          error: 'invalid_enterprise_contract_transition',
          previousStatus: result.previousStatus,
        },
        { status: 409 },
      );
    }

    if (result.outcome === 'platform_role_required' || result.outcome === 'insufficient_platform_role') {
      return noStoreJson({ error: 'platform_contract_role_required' }, { status: 403 });
    }

    if (result.outcome === 'invalid_input' || result.outcome === 'reason_required') {
      return noStoreJson({ error: 'invalid_contract_transition_payload' }, { status: 400 });
    }

    if (result.outcome === 'unchanged') {
      return noStoreJson({ changed: false, status: result.appliedStatus, version: result.version });
    }

    if (result.outcome !== 'changed' || !result.contractId || !result.organizationId) {
      return noStoreJson({ error: 'enterprise_contract_transition_unavailable' }, { status: 503 });
    }

    return noStoreJson({
      changed: true,
      contractId: result.contractId,
      organizationId: result.organizationId,
      previousStatus: result.previousStatus,
      status: result.appliedStatus,
      version: result.version,
    });
  } catch (error) {
    if (error instanceof PlatformAdminError) {
      return noStoreJson({ error: error.code }, { status: error.status });
    }
    return secureApiError(error, request);
  }
}
