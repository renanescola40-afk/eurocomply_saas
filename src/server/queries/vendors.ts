import { createAdminClient } from '@/lib/supabase/admin';

export async function listVendors(organizationId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getVendor(vendorId: string, organizationId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('id', vendorId)
    .eq('organization_id', organizationId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
