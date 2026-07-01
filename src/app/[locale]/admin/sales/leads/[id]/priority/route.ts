import { NextResponse } from 'next/server';

import { assertSalesConsoleFormRequest, updateLeadPriority } from '@/server/sales/lead-operations';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type RouteContext = {
  params: Promise<{ locale: string; id: string }>;
};

function redirectToLead(request: Request, locale: string, id: string, error?: string) {
  const url = new URL(`/${locale}/admin/sales/leads/${id}`, request.url);
  if (error) url.searchParams.set('salesError', error);
  const response = NextResponse.redirect(url, { status: 303 });
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  return response;
}

export async function POST(request: Request, context: RouteContext) {
  const { locale, id } = await context.params;

  try {
    assertSalesConsoleFormRequest(request);
    const formData = await request.formData();
    formData.set('leadId', id);
    await updateLeadPriority(request, formData);
    return redirectToLead(request, locale, id);
  } catch {
    return redirectToLead(request, locale, id, 'priority_update_failed');
  }
}
