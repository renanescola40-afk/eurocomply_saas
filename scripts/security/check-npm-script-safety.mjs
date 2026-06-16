import { readFileSync } from 'node:fs';

const packageJsonPath = 'package.json';
const failures = [];

const forbiddenScriptPatterns = [
  { name: 'curl piped to shell', pattern: /curl\s+[^|]+\|\s*(bash|sh)/i },
  { name: 'wget piped to shell', pattern: /wget\s+[^|]+\|\s*(bash|sh)/i },
  { name: 'remote shell execution', pattern: /(bash|sh)\s+-c\s+['\"]?\$\(curl/i },
  { name: 'eval execution', pattern: /(^|\s)eval\s+/i },
  { name: 'unsafe chmod', pattern: /chmod\s+777/i },
  { name: 'environment dump', pattern: /(^|\s)(printenv|env)\s*(\||>|$)/i },
  { name: 'dotenv file read', pattern: /cat\s+\.env/i },
  { name: 'recursive force remove root-ish path', pattern: /rm\s+-rf\s+(\/|\.|\.\/|\$\{?\w+\}?)/i },
];

const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const scripts = pkg.scripts ?? {};

for (const [scriptName, command] of Object.entries(scripts)) {
  for (const check of forbiddenScriptPatterns) {
    if (check.pattern.test(String(command))) {
      failures.push(`package.json scripts.${scriptName} contains forbidden pattern: ${check.name}`);
    }
  }
}

console.log('EuroComply npm script safety check');
console.log('------------------------------------');
console.log(`Scanned ${Object.keys(scripts).length} npm scripts.`);

if (failures.length > 0) {
  console.error('npm script safety failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('npm script safety: ok');
}
