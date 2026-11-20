import { validateQaEnvironment } from './qa-environment-guard.mjs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export function validateNetlifyPreview(env) {
  if (env.NETLIFY !== 'true' || env.CONTEXT !== 'deploy-preview') {
    return { checked: true, errors: ['Netlify Production and branch deployments are not authorized'] };
  }
  return validateQaEnvironment(env);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const result = validateNetlifyPreview(process.env);
  if (result.errors.length) {
    for (const error of result.errors) console.error(error);
    process.exitCode = 1;
  }
}
