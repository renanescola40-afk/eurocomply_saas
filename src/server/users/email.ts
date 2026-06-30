import { reportError } from '@/lib/observability/report-error';
import { createAdminClient } from '@/lib/supabase/admin';

async function getSupabaseUserEmail(userId: string, area: string) {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.auth.admin.getUserById(userId);

    if (error) {
      reportError(error, { area: `${area}_lookup`, userId });
      return null;
    }

    return data.user?.email ?? null;
  } catch (error) {
    reportError(error, { area: `${area}_lookup`, userId });
    return null;
  }
}

export async function getUserEmailById(userId: string, area = 'user_email_lookup') {
  return getSupabaseUserEmail(userId, area);
}
