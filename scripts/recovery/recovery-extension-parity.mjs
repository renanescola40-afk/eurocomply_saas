const MAX_IDENTIFIER_BYTES = 128;
const MAX_CATALOG_TEXT_BYTES = 256;

function assertIdentifier(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label}_missing`);
  }
  if (value.includes('\u0000') || Buffer.byteLength(value, 'utf8') > MAX_IDENTIFIER_BYTES) {
    throw new Error(`${label}_invalid`);
  }
  return value;
}

function assertCatalogText(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label}_missing`);
  }
  if (/\p{Cc}/u.test(value) || Buffer.byteLength(value, 'utf8') > MAX_CATALOG_TEXT_BYTES) {
    throw new Error(`${label}_invalid`);
  }
  return value;
}

export function quotePgIdentifier(value) {
  return `"${assertIdentifier(value, 'postgres_identifier').replaceAll('"', '""')}"`;
}

export function quotePgLiteral(value) {
  return `'${assertCatalogText(value, 'postgres_literal').replaceAll("'", "''")}'`;
}

export function normalizeInstalledExtensions(value) {
  if (!Array.isArray(value)) throw new Error('installed_extension_inventory_invalid');
  const seen = new Set();
  const normalized = value.map((entry) => {
    const name = assertIdentifier(entry?.name, 'extension_name');
    const schema = assertIdentifier(entry?.schema, 'extension_schema');
    const version = assertCatalogText(entry?.version, 'extension_version');
    if (seen.has(name)) throw new Error('installed_extension_inventory_duplicate');
    seen.add(name);
    return { name, schema, version };
  });
  return normalized.sort((a, b) => a.name.localeCompare(b.name));
}

export function normalizeAvailableExtensions(value) {
  if (!Array.isArray(value)) throw new Error('available_extension_inventory_invalid');
  const seen = new Set();
  const normalized = value.map((entry) => {
    const name = assertIdentifier(entry?.name, 'available_extension_name');
    const version = assertCatalogText(entry?.version, 'available_extension_version');
    const key = `${name}\u0000${version}`;
    if (seen.has(key)) throw new Error('available_extension_inventory_duplicate');
    seen.add(key);
    const fixedSchema = entry?.schema == null || entry.schema === ''
      ? null
      : assertIdentifier(entry.schema, 'available_extension_schema');
    return {
      name,
      version,
      relocatable: entry?.relocatable === true,
      schema: fixedSchema,
    };
  });
  return normalized.sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
}

export function planExtensionParity(sourceInventory, targetInventory, availableInventory) {
  const source = normalizeInstalledExtensions(sourceInventory);
  const target = normalizeInstalledExtensions(targetInventory);
  const available = normalizeAvailableExtensions(availableInventory);
  const targetByName = new Map(target.map((entry) => [entry.name, entry]));
  const availableByNameVersion = new Map(
    available.map((entry) => [`${entry.name}\u0000${entry.version}`, entry]),
  );
  const enable = [];
  const unavailableVersions = [];
  const schemaMismatches = [];
  const versionMismatches = [];

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
      if (installed.version !== expected.version) {
        versionMismatches.push({
          name: expected.name,
          expectedVersion: expected.version,
          observedVersion: installed.version,
        });
      }
      continue;
    }

    const candidate = availableByNameVersion.get(`${expected.name}\u0000${expected.version}`);
    if (!candidate) {
      unavailableVersions.push({ name: expected.name, version: expected.version });
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
    const versionSql = quotePgLiteral(expected.version);
    const extensionSql = candidate.relocatable
      ? `create extension if not exists ${quotePgIdentifier(expected.name)} with schema ${quotePgIdentifier(expected.schema)} version ${versionSql};`
      : `create extension if not exists ${quotePgIdentifier(expected.name)} version ${versionSql};`;
    enable.push({
      name: expected.name,
      schema: expected.schema,
      version: expected.version,
      sql: `${schemaSql}\n${extensionSql}`,
    });
  }

  return {
    source,
    target,
    enable,
    unavailableVersions,
    schemaMismatches,
    versionMismatches,
  };
}

export function extensionParitySatisfied(sourceInventory, targetInventory) {
  const source = normalizeInstalledExtensions(sourceInventory);
  const target = normalizeInstalledExtensions(targetInventory);
  if (source.length !== target.length) return false;
  return source.every((entry, index) => {
    const observed = target[index];
    return observed?.name === entry.name
      && observed.schema === entry.schema
      && observed.version === entry.version;
  });
}
