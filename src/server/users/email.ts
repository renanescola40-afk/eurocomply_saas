import { isReservedNonDeliverableEmail } from '@/lib/email/recipient-policy';
import { getRecipientLocaleFromMetadata } from '@/lib/i18n/recipient-locale';
import type { Locale } from '@/lib/i18n/routing';
import { reportError } from '@/lib/observability/report-error';
import { createAdminClient } from '@/lib/supabase/admin';

export type UserEmailContext = {
  email: string | null;
  locale: Locale;
};

async function getSupabaseUserEmailContext(userId: string, area: string): Promise<UserEmailContext> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.auth.admin.getUserById(userId);

    if (error) {
      reportError(error, { area: `${area}_lookup`, userId });
      return { email: null, locale: 'en' };
    }

    const email = data.user?.email ?? null;

    return {
      email: email && !isReservedNonDeliverableEmail(email) ? email : null,
      locale: getRecipientLocaleFromMetadata(data.user?.user_metadata),
    };
  } catch (error) {
    reportError(error, { area: `${area}_lookup`, userId });
    return { email: null, locale: 'en' };
  }
}

export async function getUserEmailContextById(userId: string, area = 'user_email_context_lookup') {
  return getSupabaseUserEmailContext(userId, area);
}

export async function getUserEmailById(userId: string, area = 'user_email_lookup') {
  const context = await getSupabaseUserEmailContext(userId, area);
  return context.email;
}
