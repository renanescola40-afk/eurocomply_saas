export type StableJsonValue =
  | null
  | boolean
  | number
  | string
  | StableJsonValue[]
  | { [key: string]: StableJsonValue | undefined };

function normalizeValue(value: StableJsonValue): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item));
  }

  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort((left, right) => left.localeCompare(right))
      .reduce<Record<string, unknown>>((normalized, key) => {
        const child = value[key];
        if (child !== undefined) {
          normalized[key] = normalizeValue(child);
        }
        return normalized;
      }, {});
  }

  return value;
}

export function stableJsonStringify(value: StableJsonValue, spacing = 0) {
  return JSON.stringify(normalizeValue(value), null, spacing);
}
