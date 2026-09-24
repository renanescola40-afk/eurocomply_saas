import { TenantMfaEnrollment } from '@/components/security/tenant-mfa-enrollment';

function safeNextPath(locale: string, value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  const fallback = `/${locale}/dashboard/organizations`;
  if (!candidate) return fallback;
  if (!candidate.startsWith(`/${locale}/`) || candidate.startsWith('//')) return fallback;
  return candidate;
}

export default async function TenantMfaPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { locale } = await params;
  const query = await searchParams;

  return <TenantMfaEnrollment locale={locale} nextPath={safeNextPath(locale, query.next)} />;
}
