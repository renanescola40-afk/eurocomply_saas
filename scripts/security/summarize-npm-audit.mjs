import { existsSync, readFileSync } from 'node:fs';

const auditPath = process.argv[2] ?? 'npm-audit.json';
const severityRank = {
  info: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

function formatFix(fixAvailable) {
  if (!fixAvailable) return 'no automated fix advertised';
  if (fixAvailable === true) return 'automated fix advertised';
  if (typeof fixAvailable === 'object') {
    const version = fixAvailable.version ? ` -> ${fixAvailable.version}` : '';
    const major = fixAvailable.isSemVerMajor ? ' (semver-major)' : '';
    return `${fixAvailable.name ?? 'package'}${version}${major}`;
  }

  return String(fixAvailable);
}

function summarizeVia(via = []) {
  const labels = via.map((item) => {
    if (typeof item === 'string') return item;
    if (item?.title) return item.title;
    if (item?.source) return `advisory ${item.source}`;
    return null;
  }).filter(Boolean);

  return labels.length > 0 ? labels.join('; ') : 'dependency chain advisory';
}

function fromModernAudit(audit) {
  return Object.entries(audit.vulnerabilities ?? {}).map(([name, details]) => ({
    name,
    severity: details.severity ?? 'unknown',
    direct: Boolean(details.isDirect),
    via: summarizeVia(details.via),
    range: details.range ?? 'not specified',
    nodes: details.nodes ?? [],
    effects: details.effects ?? [],
    fix: formatFix(details.fixAvailable),
  }));
}

function fromLegacyAudit(audit) {
  return Object.values(audit.advisories ?? {}).map((details) => ({
    name: details.module_name ?? details.name ?? 'unknown',
    severity: details.severity ?? 'unknown',
    direct: false,
    via: details.title ?? 'legacy advisory',
    range: details.vulnerable_versions ?? 'not specified',
    nodes: details.findings?.flatMap((finding) => finding.paths ?? []) ?? [],
    effects: [],
    fix: details.patched_versions ? `patched in ${details.patched_versions}` : 'not specified',
  }));
}

if (!existsSync(auditPath)) {
  console.error(`Audit file not found: ${auditPath}`);
  console.error('Generate it with: npm run security:npm-audit:json > npm-audit.json');
  process.exit(1);
}

const audit = JSON.parse(readFileSync(auditPath, 'utf8'));
const vulnerabilities = [
  ...fromModernAudit(audit),
  ...fromLegacyAudit(audit),
].sort((a, b) => (severityRank[b.severity] ?? -1) - (severityRank[a.severity] ?? -1) || a.name.localeCompare(b.name));

const counts = audit.metadata?.vulnerabilities;

console.log('EuroComply npm audit triage summary');
console.log('------------------------------------');
console.log(`Source: ${auditPath}`);

if (counts) {
  console.log(`Counts: info=${counts.info ?? 0}, low=${counts.low ?? 0}, moderate=${counts.moderate ?? 0}, high=${counts.high ?? 0}, critical=${counts.critical ?? 0}, total=${counts.total ?? vulnerabilities.length}`);
} else {
  console.log(`Counts: total=${vulnerabilities.length}`);
}

if (vulnerabilities.length === 0) {
  console.log('No vulnerabilities found in the audit report.');
  process.exit(0);
}

console.log('');
for (const vulnerability of vulnerabilities) {
  const scope = vulnerability.direct ? 'direct' : 'transitive';
  console.log(`- ${vulnerability.name} [${vulnerability.severity}, ${scope}]`);
  console.log(`  advisory: ${vulnerability.via}`);
  console.log(`  vulnerable range: ${vulnerability.range}`);
  console.log(`  fix: ${vulnerability.fix}`);

  if (vulnerability.effects.length > 0) {
    console.log(`  effects: ${vulnerability.effects.join(', ')}`);
  }

  if (vulnerability.nodes.length > 0) {
    console.log(`  paths: ${vulnerability.nodes.slice(0, 5).join(', ')}${vulnerability.nodes.length > 5 ? ` (+${vulnerability.nodes.length - 5} more)` : ''}`);
  }
}

console.log('');
console.log('Next: update only the affected package chain, avoid `npm audit fix --force`, then rerun build/security gates.');
