import { type Locale } from '@/lib/i18n/routing';

export const RECIPIENT_LOCALE_METADATA_KEY = 'preferred_language' as const;
export const RECIPIENT_LOCALE_FALLBACK: Locale = 'en';

export function resolveRecipientLocale(_value: unknown): Locale {
  return RECIPIENT_LOCALE_FALLBACK;
}

export function getRecipientLocaleFromMetadata(metadata: unknown): Locale {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return RECIPIENT_LOCALE_FALLBACK;
  }

  const record = metadata as Record<string, unknown>;
  return resolveRecipientLocale(record[RECIPIENT_LOCALE_METADATA_KEY]);
}

export function withRecipientLocaleMetadata(
  metadata: Record<string, unknown> | null | undefined,
  locale: Locale,
): Record<string, unknown> {
  return {
    ...(metadata ?? {}),
    [RECIPIENT_LOCALE_METADATA_KEY]: resolveRecipientLocale(locale),
  };
}
