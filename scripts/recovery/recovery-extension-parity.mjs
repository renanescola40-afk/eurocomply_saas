const MAX_IDENTIFIER_BYTES = 128;

function assertIdentifier(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label}_missing`);
  }
  if (value.includes('\u0000') || Buffer.byteLength(value, 'utf8') > MAX_IDENTIFIER_BYTES) {
    throw new Error(`${label}_invalid`);
  }
  return value;
}

export function quotePgIdentifier(value) {
  return `"${assertIdentifier(value, 'postgres_identifier').replaceAll('"', '""')}"`;
}

export function normalizeInstalledExtensions(value) {
  if (!Array.isArray(value)) throw new Error('installed_extension_inventory_invalid');
  const seen = new Set();
  const normalized = value.map((entry) => {
    const name = assertIdentifier(entry?.name, 'extension_name');
    const schema = assertIdentifier(entry?.schema, 'extension_schema');
    if (seen.has(name)) throw new Error('installed_extension_inventory_duplicate');
    seen.add(name);
    return { name, schema };
  });
  return normalized.sort((a, b) => a.name.localeCompare(b.name));
}

export function normalizeAvailableExtensions(value) {
  if (!Array.isArray(value)) throw new Error('available_extension_inventory_invalid');
  const seen = new Set();
  const normalized = value.map((entry) => {
    const name = assertIdentifier(entry?.name, 'available_extension_name');
    if (seen.has(name)) throw new Error('available_extension_inventory_duplicate');
    seen.add(name);
    const fixedSchema = entry?.schema == null || entry.schema === ''
      ? null
      : assertIdentifier(entry.schema, 'available_extension_schema');
    return {
      name,
      relocatable: entry?.relocatable === true,
      schema: fixedSchema,
    };
  });
  return normalized.sort((a, b) => a.name.localeCompare(b.name));
}

export function planExtensionParity(sourceInventory, targetInventory, availableInventory) {
  const source = normalizeInstalledExtensions(sourceInventory);
  const target = normalizeInstalledExtensions(targetInventory);
  const available = normalizeAvailableExtensions(availableInventory);
  const targetByName = new Map(target.map((entry) => [entry.name, entry]));
  const availableByName = new Map(available.map((entry) => [entry.name, entry]));
  const enable = [];
  const unavailable = [];
  const schemaMismatches = [];

  for (const expected of source) {
    const installed = targetByName.get(expected.name);
    if (installed) {
      if (installed.schema !== expected.schema) {
        schemaMismatches.push({
          name: expected.name,
          expectedSchema: expected.schema,
          observedSchema: installed.schema,
        });
      }
      continue;
    }

    const candidate = availableByName.get(expected.name);
    if (!candidate) {
      unavailable.push(expected.name);
      continue;
    }

    if (!candidate.relocatable && candidate.schema && candidate.schema !== expected.schema) {
      schemaMismatches.push({
        name: expected.name,
        expectedSchema: expected.schema,
        observedSchema: candidate.schema,
      });
      continue;
    }

    const schemaSql = `create schema if not exists ${quotePgIdentifier(expected.schema)};`;
    const extensionSql = candidate.relocatable
      ? `create extension if not exists ${quotePgIdentifier(expected.name)} with schema ${quotePgIdentifier(expected.schema)};`
      : `create extension if not exists ${quotePgIdentifier(expected.name)};`;
    enable.push({ name: expected.name, schema: expected.schema, sql: `${schemaSql}\n${extensionSql}` });
  }

  return { source, target, enable, unavailable, schemaMismatches };
}

export function extensionParitySatisfied(sourceInventory, targetInventory) {
  const source = normalizeInstalledExtensions(sourceInventory);
  const target = normalizeInstalledExtensions(targetInventory);
  const targetByName = new Map(target.map((entry) => [entry.name, entry.schema]));
  return source.every((entry) => targetByName.get(entry.name) === entry.schema);
}
