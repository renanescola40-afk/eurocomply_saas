import { existsSync, readFileSync } from 'node:fs';

const failures = [];

function readRequired(path) {
  if (!existsSync(path)) {
    failures.push(`${path} is missing`);
    return '';
  }

  return readFileSync(path, 'utf8');
}

function has(source, tokens) {
  return tokens.every((token) => source.includes(token));
}

function hasFilenameGateBeforeResponses(packageSource) {
  const scriptMatch = packageSource.match(/"security:ci"\s*:\s*"(?<command>[^"]+)"/);
  const command = scriptMatch?.groups?.command ?? '';
  const filenameIndex = command.indexOf('security:document-filenames');
  const responsesIndex = command.indexOf('security:responses');

  return filenameIndex >= 0 && responsesIndex > filenameIndex;
}

console.log('EuroComply file name guard check');
console.log('----------------------------------');

const helperPath = 'src/lib/documents/upload.ts';
const actionPath = 'src/server/actions/document-downloads.ts';
const testPath = 'src/lib/documents/upload.test.ts';
const packagePath = 'package.json';

const helperSource = readRequired(helperPath);
const actionSource = readRequired(actionPath);
const testSource = readRequired(testPath);
const packageSource = readRequired(packagePath);

if (!has(helperSource, [
  'sanitizeDocumentDownloadFileName',
  'sanitizeDocumentStorageFileName',
  'normalizeDocumentFileName',
  'DOCUMENT_FILENAME_FALLBACK',
  'MAX_DOCUMENT_FILENAME_LENGTH',
  'NFKC',
])) {
  failures.push(`${helperPath} must centralize file name normalization`);
}

if (!actionSource.includes('sanitizeDocumentDownloadFileName')) {
  failures.push(`${actionPath} must call the file name guard before creating a temporary document link`);
}

if (!has(testSource, [
  'sanitizes storage file names',
  'sanitizes signed download filenames',
  'sanitizeDocumentDownloadFileName',
  'sanitizeDocumentStorageFileName',
])) {
  failures.push(`${testPath} must cover stored and returned file names`);
}

if (!packageSource.includes('"security:document-filenames"')) {
  failures.push(`${packagePath} must expose security:document-filenames`);
}

if (!hasFilenameGateBeforeResponses(packageSource)) {
  failures.push('security:ci must run security:document-filenames before response checks');
}

if (failures.length > 0) {
  console.error('File name guard failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('File name guard: ok');
}
