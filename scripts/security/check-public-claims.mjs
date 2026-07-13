#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const SCAN_TARGETS = [
  'src/messages',
  'src/components/marketing',
  'src/lib/email',
  'src/lib/trust-center/content.ts',
  'src/app/[locale]/page.tsx',
  'src/app/[locale]/pricing/page.tsx',
  'src/app/[locale]/enterprise/page.tsx',
  'src/app/[locale]/trust/page.tsx',
  'src/app/[locale]/security/page.tsx',
  'src/app/[locale]/risck-comply-home/page.tsx',
  'src/app/[locale]/retention-center/page.tsx',
];

const SUPPORTED_EXTENSIONS = new Set(['.json', '.ts', '.tsx']);

const PROHIBITED_CLAIM_PATTERNS = [
  { label: 'legacy customer-facing brand', pattern: /\bEuroComply\b/i },
  { label: 'unsupported quantified outcome', pattern: /(?:73\s*%|40\s*(?:hours?|hrs?|horas?|heures?|stunden|ore))\b/i },
  { label: 'full or guaranteed compliance claim', pattern: /\b(?:fully compliant|guaranteed compliance|compliance guarantee|legal guarantee)\b/i },
  { label: 'GDPR compliance guarantee', pattern: /\b(?:GDPR compliant|DSGVO-konform|conforme RGPD|conforme al GDPR|conforme al RGPD)\b/i },
  { label: 'SOC 2 compliance or certification claim', pattern: /SOC\s*2[^\n]{0,80}\b(?:compliant|certified|attested|passed)\b/i },
  { label: 'ISO 27001 compliance or certification claim', pattern: /ISO\s*27001[^\n]{0,80}\b(?:compliant|certified|passed)\b/i },
  { label: 'unsupported certification or pentest claim', pattern: /\b(?:certified|pentested|penetration-tested|externally audited)\b/i },
  { label: 'enterprise or procurement readiness claim', pattern: /\b(?:enterprise-ready|procurement-ready|pronto para enterprise|listo para enterprise|pr[eê]t pour enterprise|pronto enterprise)\b/i },
  { label: 'immutable audit log claim', pattern: /\b(?:immutable audit (?:log|trail)|WORM-backed audit)\b/i },
  { label: '24/7 operations claim', pattern: /24\s*\/\s*7[^\n]{0,80}\b(?:monitor(?:ed|ing)?|support|staffed|response)\b/i },
  { label: 'automatic AI Act compliance claim', pattern: /\bautomatic(?:ally)?[^\n]{0,80}\b(?:EU\s*)?AI Act[^\n]{0,80}\b(?:compliance|compliant)\b/i },
  { label: 'professional replacement claim', pattern: /\b(?:replace(?:s)?|substitui|sustituye|remplace|sostituisce|ersetzt)\b[^\n]{0,80}\b(?:lawyers?|legal counsel|advogados?|abogados?|avocats?|avvocati?|anw[aä]lte|DPOs?|compliance officers?)\b/i },
  { label: 'unsupported unlimited-country scope', pattern: /\b(?:unlimited countries|pa[ií]ses ilimitados|pays illimit[eé]s|paesi illimitati|unbegrenzte l[aä]nder)\b/i },
  { label: 'unsupported signed retention export', pattern: /(?:\b(?:signed|assinado|firmado|sign[eé]|signierten?)\b[^\n]{0,100}\b(?:retention|reten[cç][aã]o|retenci[oó]n|r[eé]tention|aufbewahrung)\b|\b(?:retention|reten[cç][aã]o|retenci[oó]n|r[eé]tention|aufbewahrung)\b[^\n]{0,100}\b(?:signed|assinado|firmado|sign[eé]|signierten?)\b)/i },
];

const SAFE_NEGATION_CONTEXT = /(?:\bnot\b|\bdoes not\b|\bdo not\b|\bmust not\b|\bwithout\b|\bunless\b|\bpending\b|\bnot yet\b|\bnot claimed\b|\bno\b|\bn[aã]o\b|\bsem\b|\bno se\b|\bsin\b|\bne\b.{0,40}\bpas\b|\bsans\b|\bnon\b|\bsenza\b|\bnicht\b|\bkein(?:e|en|er|es)?\b|\bohne\b)/i;

const failures = [];

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

function scanValue(source, value) {
  const normalized = value.trim();
  if (!normalized || SAFE_NEGATION_CONTEXT.test(normalized)) return;

  for (const { label, pattern } of PROHIBITED_CLAIM_PATTERNS) {
    if (pattern.test(normalized)) failures.push(`${source}: possible ${label}`);
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

  stripPolicyDefinitions(relativePath, content)
    .split('\n')
    .forEach((line, index) => scanValue(`${relativePath}:${index + 1}`, line));
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

console.log('Customer-facing claims: ok');
