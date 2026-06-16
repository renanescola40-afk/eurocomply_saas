import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const workflowDir = '.github/workflows';
const failures = [];

function workflowFiles() {
  if (!existsSync(workflowDir)) return [];
  return readdirSync(workflowDir)
    .filter((name) => /\.ya?ml$/.test(name))
    .map((name) => join(workflowDir, name));
}

function actionUses(source) {
  return [...source.matchAll(/^\s*uses:\s*([^\s#]+)\s*$/gm)].map((match) => match[1]);
}

function containerImages(source) {
  return [...source.matchAll(/^\s*image:\s*([^\s#]+)\s*$/gm)].map((match) => match[1]);
}

function isFloatingActionRef(specifier) {
  if (specifier.startsWith('docker://')) return specifier.endsWith(':latest') || !specifier.includes(':');
  if (!specifier.includes('@')) return true;
  const ref = specifier.split('@').pop() ?? '';
  return ['main', 'master', 'latest', 'HEAD'].includes(ref) || ref.length === 0;
}

function isFloatingImage(image) {
  if (image.includes('@sha256:')) return false;
  const tag = image.includes(':') ? image.split(':').pop() : '';
  return !tag || tag === 'latest';
}

for (const file of workflowFiles()) {
  const source = readFileSync(file, 'utf8');

  for (const specifier of actionUses(source)) {
    if (isFloatingActionRef(specifier)) {
      failures.push(`${file}: action reference must use a non-floating version tag or digest: ${specifier}`);
    }
  }

  for (const image of containerImages(source)) {
    if (isFloatingImage(image)) {
      failures.push(`${file}: container image must use a non-latest tag or digest: ${image}`);
    }
  }
}

console.log('EuroComply workflow pinned action check');
console.log('----------------------------------------');
console.log(`Scanned ${workflowFiles().length} workflow files.`);

if (failures.length > 0) {
  console.error('Workflow pinning failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Workflow action/container pinning: ok');
}
