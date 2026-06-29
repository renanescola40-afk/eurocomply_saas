import { NextResponse, type NextRequest } from 'next/server';

import { defaultLocale, locales, type Locale } from '@/lib/i18n/routing';
import { applyNoStoreHeaders } from '@/server/security/no-store';

function getLocaleFromRequest(request: NextRequest): Locale {
  const firstPathSegment = request.nextUrl.pathname.split('/').filter(Boolean)[0];
  return locales.includes(firstPathSegment as Locale) ? firstPathSegment as Locale : defaultLocale;
}

export function GET(request: NextRequest) {
  const locale = getLocaleFromRequest(request);
  const completionUrl = new URL(`/${locale}/oauth/complete`, request.url);
  completionUrl.search = request.nextUrl.search;

  return applyNoStoreHeaders(NextResponse.redirect(completionUrl));
}
