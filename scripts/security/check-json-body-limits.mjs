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

console.log('EuroComply JSON body limit check');
console.log('----------------------------------');

const validate = read(VALIDATE_PATH);
const test = read(TEST_PATH);

requireToken(validate, 'DEFAULT_JSON_BODY_MAX_BYTES', `${VALIDATE_PATH} must define a default JSON body limit.`);
requireToken(validate, 'readBoundedJsonRequest', `${VALIDATE_PATH} must expose a bounded JSON reader.`);
requireToken(validate, 'content-length', `${VALIDATE_PATH} must reject oversized content-length before reading the body.`);
requireToken(validate, 'content-type', `${VALIDATE_PATH} must validate JSON content type by default.`);
requireToken(validate, 'request.body.getReader()', `${VALIDATE_PATH} must stream request bodies instead of buffering them first.`);
requireToken(validate, 'value.byteLength', `${VALIDATE_PATH} must count raw streamed bytes.`);
requireToken(validate, "reader.cancel('Request body is too large')", `${VALIDATE_PATH} must cancel oversized request streams.`);
requireToken(validate, "new TextDecoder('utf-8', { fatal: true })", `${VALIDATE_PATH} must fail closed on invalid UTF-8.`);
requireToken(validate, 'JSON.parse', `${VALIDATE_PATH} must parse only after bounded reads.`);

if (/request\.(json|text)\s*\(/.test(validate)) {
  failures.push(`${VALIDATE_PATH} must not call request.json() or request.text() internally.`);
}

requireToken(test, 'rejects missing JSON content type by default', `${TEST_PATH} must cover content-type rejection.`);
requireToken(test, 'rejects oversized content length before parsing', `${TEST_PATH} must cover content-length rejection.`);
requireToken(test, 'rejects oversized bodies even when content length is absent or wrong', `${TEST_PATH} must cover undeclared or misleading lengths.`);
requireToken(test, 'cancels a streamed body as soon as the byte limit is exceeded', `${TEST_PATH} must cover stream cancellation on overflow.`);
requireToken(test, 'rejects invalid UTF-8 before JSON parsing', `${TEST_PATH} must cover invalid UTF-8 rejection.`);
requireToken(test, 'returns sanitized no-store validation errors', `${TEST_PATH} must cover sanitized no-store validation responses.`);

for (const path of walk(API_ROOT)) {
  const source = readFileSync(path, 'utf8');
  if (/\brequest\.json\s*\(/.test(source)) {
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
