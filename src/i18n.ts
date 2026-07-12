import { getRequestConfig } from 'next-intl/server';

import { isSupportedLocale } from './lib/i18n/locales';
import { routing } from './lib/i18n/routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requestedLocale = await requestLocale;
  const locale = isSupportedLocale(requestedLocale)
    ? requestedLocale
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
