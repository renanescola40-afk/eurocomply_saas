import { existsSync, readFileSync } from 'node:fs';

const DEFAULT_LOCAL_ENV_FILES = ['.env.local'];

function unquoteEnvValue(value) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function loadLocalEnv(options = {}) {
  const files = options.files ?? DEFAULT_LOCAL_ENV_FILES;
  const loaded = [];

  for (const file of files) {
    if (!existsSync(file)) continue;

    const source = readFileSync(file, 'utf8');
    for (const rawLine of source.split(/\r?\n/u)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      const normalized = line.startsWith('export ') ? line.slice('export '.length).trim() : line;
      const separatorIndex = normalized.indexOf('=');
      if (separatorIndex <= 0) continue;

      const name = normalized.slice(0, separatorIndex).trim();
      if (!/^[A-Z0-9_]+$/u.test(name)) continue;
      if (Object.prototype.hasOwnProperty.call(process.env, name) && process.env[name]) continue;

      process.env[name] = unquoteEnvValue(normalized.slice(separatorIndex + 1));
    }

    loaded.push(file);
  }

  return loaded;
}
