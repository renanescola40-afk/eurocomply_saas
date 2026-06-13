import { ADD_ON_CATALOG, type AddOnId } from '@/lib/billing/addons';

const VALID_ADD_ON_IDS = new Set<AddOnId>(ADD_ON_CATALOG.map((addOn) => addOn.id));

export function isValidAddOnId(value: string | null | undefined): value is AddOnId {
  return Boolean(value && VALID_ADD_ON_IDS.has(value as AddOnId));
}

export function getAddOnIdFromMetadata(metadata: Record<string, string> | null | undefined): AddOnId | null {
  const candidate = metadata?.add_on_id ?? metadata?.addOnId ?? metadata?.eurocomply_add_on_id;
  return isValidAddOnId(candidate) ? candidate : null;
}
