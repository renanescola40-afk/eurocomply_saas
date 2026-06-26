import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const API_ROOT = 'src/app/api';
const VALIDATE_PATH = 'src/lib/security/validate.ts';
const TEST_PATH = 'src/lib/security/validate.test.ts';

const failures = [];

function read(path) {
  if (!existsSync(path)) {
    failures.push(`${path} is missing.`);
    return '';
  }

  return readFileSync(path, 'utf8');
}

function walk(dir) {
  if (!existsSync(dir)) return [];

  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) return walk(path);
    if (stat.isFile() && path.endsWith('.ts')) return [path];
    return [];
  });
}

function requireToken(source, token, message) {
  if (!source.includes(token)) failures.push(message);
}

function isInternalTokenAuthorizedRoute(source) {
  return source.includes('isAuthorizedInternalCronRequest');
}

console.log('EuroComply JSON body limit check');
console.log('----------------------------------');

const validate = read(VALIDATE_PATH);
const test = read(TEST_PATH);

requireToken(validate, 'DEFAULT_JSON_BODY_MAX_BYTES', `${VALIDATE_PATH} must define a default JSON body limit.`);
requireToken(validate, 'readBoundedJsonRequest', `${VALIDATE_PATH} must expose a bounded JSON reader.`);
requireToken(validate, 'content-length', `${VALIDATE_PATH} must reject oversized content-length before reading the body.`);
requireToken(validate, 'content-type', `${VALIDATE_PATH} must validate JSON content type by default.`);
requireToken(validate, 'request.text()', `${VALIDATE_PATH} must read text before JSON.parse so size can be enforced.`);
requireToken(validate, 'JSON.parse', `${VALIDATE_PATH} must parse only after bounded reads.`);

if (/request\.json\s*\(/.test(validate)) {
  failures.push(`${VALIDATE_PATH} must not call request.json() internally.`);
}

requireToken(test, 'rejects missing JSON content type by default', `${TEST_PATH} must cover content-type rejection.`);
requireToken(test, 'rejects oversized content length before parsing', `${TEST_PATH} must cover content-length rejection.`);
requireToken(test, 'rejects oversized bodies even when content length is absent or wrong', `${TEST_PATH} must cover post-read size enforcement.`);
requireToken(test, 'returns sanitized no-store validation errors', `${TEST_PATH} must cover sanitized no-store validation responses.`);

for (const path of walk(API_ROOT)) {
  const source = readFileSync(path, 'utf8');

  if (/\brequest\.json\s*\(/.test(source) && !isInternalTokenAuthorizedRoute(source)) {
    failures.push(`${path} must use readBoundedJsonRequest instead of request.json().`);
  }
}

if (failures.length > 0) {
  console.error('JSON body limit security failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('JSON body limits: ok');
}
