import { inspectLinkedInMarketingConnection } from '@/lib/marketing/linkedin-connection';
import { noStoreJson } from '@/server/security/no-store';
import { requireApiUser, secureApiError } from '@/server/security/api-guards';
import {
  PlatformAdminError,
  requirePlatformCapability,
} from '@/server/security/platform-admin';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    await requirePlatformCapability(user.id, 'security');

    const connection = await inspectLinkedInMarketingConnection();
    return noStoreJson(connection);
  } catch (error) {
    if (error instanceof PlatformAdminError) {
      return noStoreJson({ error: error.code }, { status: error.status });
    }
    return secureApiError(error, request);
  }
}
