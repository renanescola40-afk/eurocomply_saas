#!/usr/bin/env node

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const ROOT_DIR = path.resolve(path.dirname(SCRIPT_PATH), '../..');

const DEFAULT_SCAN_TARGETS = [
  'src/messages',
  'src/components/marketing',
  'src/lib/email',
  'src/lib/i18n/app-dictionary.ts',
  'src/lib/trust-center/content.ts',
  'src/app/[locale]',
];

const configuredScanTargets = (process.env.PUBLIC_CLAIMS_SCAN_TARGETS ?? '')
  .split(path.delimiter)
  .map((target) => target.trim())
  .filter(Boolean);
const SCAN_TARGETS = configuredScanTargets.length > 0 ? configuredScanTargets : DEFAULT_SCAN_TARGETS;

const SUPPORTED_EXTENSIONS = new Set(['.json', '.ts', '.tsx']);
const SOURCE_STRING_PATTERN = /(['"])((?:\\.|(?!\1).)*)\1/g;
const TEMPLATE_LITERAL_PATTERN = /`((?:\\[\s\S]|[^\\`])*)`/g;
const INLINE_JSX_TEXT_PATTERN = />([^<{]+)</g;
const PLAIN_JSX_TEXT_PATTERN = /^[\p{L}\p{N}][^{}()[\];:=<>]*$/u;

const PROHIBITED_CLAIM_PATTERNS = [
  { label: 'legacy customer-facing brand', pattern: /\bEuroComply\b/i },
  { label: 'unsupported quantified outcome', pattern: /(?:73\s*%|40\s*(?:hours?|hrs?|horas?|heures?|stunden|ore))\b/i },
  { label: 'full or guaranteed compliance claim', pattern: /\b(?:fully compliant|guaranteed compliance|compliance guarantee|legal guarantee)\b/i },
  { label: 'GDPR compliance guarantee', pattern: /\b(?:GDPR compliant|DSGVO-konform|conforme RGPD|conforme al GDPR|conforme al RGPD)\b/i },
  { label: 'SOC 2 compliance or certification claim', pattern: /SOC\s*2[^\n]{0,80}\b(?:compliant|certified|attested|passed)\b/i },
  { label: 'ISO 27001 compliance or certification claim', pattern: /ISO\s*27001[^\n]{0,80}\b(?:compliant|certified|passed)\b/i },
  { label: 'unsupported certification or pentest claim', pattern: /\b(?:certified|pentested|penetration-tested|externally audited)\b/i },
  { label: 'enterprise or procurement readiness claim', pattern: /\b(?:enterprise[- ]ready|procurement[- ]ready|pronto para enterprise|listo para enterprise|pr[eê]t pour enterprise|pronto enterprise)\b/i },
  { label: 'immutable audit log claim', pattern: /\b(?:immutable audit (?:log|trail)|WORM-backed audit)\b/i },
  { label: '24/7 operations claim', pattern: /24\s*\/\s*7[^\n]{0,80}\b(?:monitor(?:ed|ing)?|support|staffed|response)\b/i },
  { label: 'automatic AI Act compliance claim', pattern: /\bautomatic(?:ally)?[^\n]{0,80}\b(?:EU\s*)?AI Act[^\n]{0,80}\b(?:compliance|compliant)\b/i },
  { label: 'professional replacement claim', pattern: /\b(?:replace(?:s)?|substitui|sustituye|remplace|sostituisce|ersetzt)\b[^\n]{0,80}\b(?:lawyers?|legal counsel|advogados?|abogados?|avocats?|avvocati?|anw[aä]lte|DPOs?|compliance officers?)\b/i },
  { label: 'unsupported unlimited-country scope', pattern: /\b(?:unlimited countries|pa[ií]ses ilimitados|pays illimit[eé]s|paesi illimitati|unbegrenzte l[aä]nder)\b/i },
  {
    label: 'unsupported signed retention export',
    pattern: /(?=[^\n]*\b(?:retention|reten[cç][aã]o|retenci[oó]n|r[eé]tention|aufbewahrung)\b)(?:(?:signed|assinado|assinada|firmado|firmada|firmato|firmata|sign[eé]|signierte[nrms]?)[^\n]{0,48}\b(?:export(?:ed|s|ar|er|ieren)?|exporta[cç][aã]o|exportaci[oó]n|esporta(?:re|zione)?)\b|\b(?:export(?:ed|s|ar|er|ieren)?|exporta[cç][aã]o|exportaci[oó]n|esporta(?:re|zione)?)\b[^\n]{0,48}(?:signed|assinado|assinada|firmado|firmada|firmato|firmata|sign[eé]|signierte[nrms]?))/i,
  },
];

const SAFE_NEGATION_CONTEXT = /(?:\bnot\b|\bdoes not\b|\bdo not\b|\bmust not\b|\bwithout\b|\bunless\b|\bpending\b|\bnot yet\b|\bnot claimed\b|\bno\b|\bn[aã]o\b|\bsem\b|\bno se\b|\bsin\b|\bne\b.{0,40}\bpas\b|\bsans\b|\bnon\b|\bsenza\b|\bnicht\b|\bkein(?:e|en|er|es)?\b|\bohne\b)/i;

const REPORT_SURFACES = [
  {
    name: 'trustCenter',
    patterns: [
      /^src\/lib\/trust-center\//,
      /^src\/components\/marketing\/trust-center-page\.tsx$/,
      /^src\/app\/\[locale\]\/trust\//,
    ],
  },
  {
    name: 'securityPage',
    patterns: [
      /^src\/lib\/trust-center\/content\.ts$/,
      /^src\/components\/marketing\/trust-center-page\.tsx$/,
    ],
  },
  {
    name: 'complianceClaims',
    patterns: [
      /^src\/messages\//,
      /^src\/components\/marketing\//,
      /^src\/app\/\[locale\]\//,
      /^src\/lib\/email\//,
    ],
  },
];

const failures = [];

function parseArgs(argv) {
  const options = { reportPath: null };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--report') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error('--report requires a path');
      options.reportPath = value;
      index += 1;
      continue;
    }
    throw new Error(`unknown option: ${argument}`);
  }
  return options;
}

let options;
try {
  options = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(`Public claims guard configuration failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

function collectFiles(relativePath) {
  const absolutePath = path.join(ROOT_DIR, relativePath);
  if (!fs.existsSync(absolutePath)) return [];

  const stat = fs.statSync(absolutePath);
  if (stat.isFile()) return [relativePath];

  return fs
    .readdirSync(absolutePath, { withFileTypes: true })
    .flatMap((entry) => collectFiles(path.join(relativePath, entry.name)))
    .sort();
}

function isCandidate(relativePath) {
  if (!SUPPORTED_EXTENSIONS.has(path.extname(relativePath))) return false;
  return !/(?:^|\/)(?:__tests__|tests?)(?:\/|$)|\.(?:test|spec)\.[cm]?[jt]sx?$/i.test(relativePath);
}

function stripPolicyDefinitions(relativePath, content) {
  if (relativePath !== 'src/lib/trust-center/content.ts') return content;

  return content.replace(
    /export const TRUST_PROHIBITED_CLAIMS = \[[\s\S]*?\] as const;/,
    'export const TRUST_PROHIBITED_CLAIMS = [] as const;',
  );
}

function flattenJsonStrings(value, keyPath = '$') {
  if (typeof value === 'string') return [{ source: keyPath, value }];
  if (Array.isArray(value)) return value.flatMap((item, index) => flattenJsonStrings(item, `${keyPath}[${index}]`));
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, item]) => flattenJsonStrings(item, `${keyPath}.${key}`));
}

function isTechnicalString(value) {
  const normalized = value.trim();
  if (/\.(?:csv|json|txt|pdf|zip)$/i.test(normalized)) return false;

  return (
    /^(?:@\/|\.{1,2}\/|\/)/.test(normalized) ||
    /^x-[a-z0-9-]+$/.test(normalized) ||
    /^[A-Z][A-Z0-9_]+$/.test(normalized) ||
    /^[a-z0-9]+(?:[_./:][a-z0-9-]+)+$/.test(normalized)
  );
}

function isTechnicalLiteralContext(line) {
  return /\b(?:const|let|var)\s+[A-Za-z0-9_]*(?:storage|cache)[A-Za-z0-9_]*key\s*=/i.test(line);
}

function scanValue(source, value) {
  const normalized = value.replace(/\\n/g, ' ').trim();
  if (!normalized || normalized.endsWith('?') || isTechnicalString(normalized) || SAFE_NEGATION_CONTEXT.test(normalized)) return;

  for (const { label, pattern } of PROHIBITED_CLAIM_PATTERNS) {
    if (pattern.test(normalized)) failures.push(`${source}: possible ${label}`);
  }
}

function scanTemplateLiterals(relativePath, content) {
  let templateIndex = 0;

  for (const match of content.matchAll(TEMPLATE_LITERAL_PATTERN)) {
    templateIndex += 1;
    const matchIndex = match.index ?? 0;
    const lineStart = content.lastIndexOf('\n', matchIndex) + 1;
    const context = content.slice(lineStart, matchIndex);
    if (isTechnicalLiteralContext(context)) continue;

    const lineNumber = content.slice(0, matchIndex).split('\n').length;
    scanValue(`${relativePath}:${lineNumber}:template-${templateIndex}`, match[1]);
  }
}

function scanSourceLine(relativePath, line, lineNumber) {
  const skipTechnicalLiterals = isTechnicalLiteralContext(line);
  let stringIndex = 0;
  for (const match of line.matchAll(SOURCE_STRING_PATTERN)) {
    stringIndex += 1;
    if (!skipTechnicalLiterals) scanValue(`${relativePath}:${lineNumber}:string-${stringIndex}`, match[2]);
  }

  let jsxTextIndex = 0;
  for (const match of line.matchAll(INLINE_JSX_TEXT_PATTERN)) {
    jsxTextIndex += 1;
    scanValue(`${relativePath}:${lineNumber}:jsx-${jsxTextIndex}`, match[1]);
  }

  const trimmedLine = line.trim();
  if (PLAIN_JSX_TEXT_PATTERN.test(trimmedLine)) {
    scanValue(`${relativePath}:${lineNumber}:jsx-line`, trimmedLine);
  }
}

function scanFile(relativePath) {
  const absolutePath = path.join(ROOT_DIR, relativePath);
  const content = fs.readFileSync(absolutePath, 'utf8');

  if (path.extname(relativePath) === '.json') {
    try {
      const parsed = JSON.parse(content);
      for (const entry of flattenJsonStrings(parsed)) scanValue(`${relativePath}:${entry.source}`, entry.value);
    } catch (error) {
      failures.push(`${relativePath}: invalid JSON (${error instanceof Error ? error.message : String(error)})`);
    }
    return;
  }

  const scannableContent = stripPolicyDefinitions(relativePath, content);
  scanTemplateLiterals(relativePath, scannableContent);
  scannableContent
    .split('\n')
    .forEach((line, index) => scanSourceLine(relativePath, line, index + 1));
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function buildReport(files) {
  const targetSha = process.env.PUBLIC_CLAIMS_TARGET_SHA?.trim() || null;
  if (targetSha && !/^[0-9a-f]{40}$/i.test(targetSha)) {
    throw new Error('PUBLIC_CLAIMS_TARGET_SHA must be a full 40-character commit SHA');
  }

  const fileEvidence = files.map((relativePath) => {
    const bytes = fs.readFileSync(path.join(ROOT_DIR, relativePath));
    return { path: relativePath, sha256: sha256(bytes) };
  });
  const surfaces = REPORT_SURFACES.map((surface) => {
    const matchedFiles = files.filter((relativePath) => surface.patterns.some((pattern) => pattern.test(relativePath)));
    if (matchedFiles.length === 0) throw new Error(`report surface ${surface.name} has no scanned files`);
    return {
      name: surface.name,
      status: 'PASS',
      passed: true,
      fileCount: matchedFiles.length,
      files: matchedFiles,
    };
  });

  return {
    schema: 'risck-comply.public-claims-report.v1',
    status: 'Complete',
    outcome: 'passed',
    generatedFromRealEvidence: true,
    source: 'repository-static-analysis',
    targetSha,
    generatedAt: new Date().toISOString(),
    policyDigest: sha256(fs.readFileSync(SCRIPT_PATH)),
    contentDigest: sha256(fileEvidence.map((entry) => `${entry.path}\0${entry.sha256}`).join('\n')),
    filesScanned: files.length,
    scanTargets: SCAN_TARGETS,
    checks: surfaces,
    files: fileEvidence,
    limitations: [
      'This report proves that the versioned customer-facing source surfaces passed the repository claims policy for one exact commit.',
      'It does not prove production deployment, legal review, certification, external audit, provider configuration or regulator acceptance.',
    ],
  };
}

const files = [...new Set(SCAN_TARGETS.flatMap(collectFiles).filter(isCandidate))].sort();

if (files.length === 0) failures.push('No customer-facing claim surfaces were found to scan.');
for (const file of files) scanFile(file);

console.log('RISCK COMPLY customer-facing claims guard');
console.log('------------------------------------------');
console.log(`Scanned ${files.length} customer-facing source files.`);

if (failures.length > 0) {
  console.error('Unsupported public claim failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

if (options.reportPath) {
  try {
    const report = buildReport(files);
    const absoluteReportPath = path.resolve(ROOT_DIR, options.reportPath);
    fs.mkdirSync(path.dirname(absoluteReportPath), { recursive: true });
    fs.writeFileSync(absoluteReportPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
    console.log(`Claims evidence report: ${path.relative(ROOT_DIR, absoluteReportPath)}`);
  } catch (error) {
    console.error(`Claims evidence report failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

console.log('Customer-facing claims: ok');
