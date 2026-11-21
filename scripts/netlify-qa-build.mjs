import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { validateNetlifyPreview } from './check-netlify-preview.mjs';
import { resolveNetlifyQaRemoteDraftUrl } from './qa-environment-guard.mjs';

// Netlify CLI --remote cannot combine with --alias. A remote draft receives an
// immutable deployment URL which must be validated BEFORE the Next.js build.
export function prepareNetlifyQaBuildEnv(source) {
  const env = { ...source };
  const remoteUrl = resolveNetlifyQaRemoteDraftUrl(env);

  if (env.NETLIFY === 'true' && env.CONTEXT === 'deploy-preview' &&
      env.RISCK_QA_NETLIFY_MANUAL_DRAFT === 'true' && env.DEPLOY_ID && !remoteUrl) {
    return { env, errors: ['Unverified Netlify QA remote draft metadata'] };
  }

  if (remoteUrl) {
    // Ensure the Netlify setting is an authorized QA-only alias, never a
    // production or unrelated origin, before deriving the actual draft URL.
    if (!/^https:\/\/qa-manual-[a-f0-9]{8}--risck-qa-isolated\.netlify\.app$/.test(env.NEXT_PUBLIC_APP_URL || '')) {
      return { env, errors: ['Configured QA app URL is not an authorized manual alias'] };
    }
    env.NEXT_PUBLIC_APP_URL = remoteUrl;
  }

  return { env, errors: validateNetlifyPreview(env).errors };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const result = prepareNetlifyQaBuildEnv(process.env);
  if (result.errors.length) {
    for (const error of result.errors) console.error('[QA_BUILD] ' + error);
    process.exitCode = 1;
  } else {
    const child = spawn('npm', ['run', 'build'], { stdio: 'inherit', env: result.env });
    child.on('error', error => {
      console.error('[QA_BUILD] npm could not start: ' + (error.code || error.name));
      process.exitCode = 1;
    });
    child.on('close', (code, signal) => {
      if (signal) console.error('[QA_BUILD] build terminated: ' + signal);
      process.exitCode = code ?? 1;
    });
  }
}
