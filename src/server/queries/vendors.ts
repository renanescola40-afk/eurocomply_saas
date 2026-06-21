import { createAdminClient, tryCreateAdminClient } from '@/lib/supabase/admin';

const VENDOR_COLUMNS = 'id,name,website,country,category,risk_level,review_status,created_at,updated_at';

export async function listVendors(organizationId: string) {
  const supabase = tryCreateAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('vendors')
    .select(VENDOR_COLUMNS)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[vendors] list_failed', { code: error.code ?? 'unknown' });
    return [];
  }

  return data ?? [];
}

export async function getVendor(vendorId: string, organizationId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('vendors')
    .select(VENDOR_COLUMNS)
    .eq('id', vendorId)
    .eq('organization_id', organizationId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
