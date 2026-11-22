import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { validateNetlifyPreview } from './check-netlify-preview.mjs';
import { QA_NETLIFY_SITE_ID, QA_NETLIFY_SITE_NAME, resolveNetlifyQaRemoteDraftUrl } from './qa-environment-guard.mjs';

// Netlify CLI --remote cannot combine with --alias. A remote draft receives an
// immutable deployment URL which must be validated BEFORE the Next.js build.
export function prepareNetlifyQaBuildEnv(source) {
  const env = { ...source };
  // This site's preview variables were originally scoped to a manual CLI draft.
  // A Git PR preview gets a different, provider-assigned origin. Rebind only
  // when the PR number, exact isolated site and QA-only manual alias agree.
  const gitPreviewUrl = `https://deploy-preview-${env.REVIEW_ID}--${QA_NETLIFY_SITE_NAME}.netlify.app`;
  const gitPreview = env.NETLIFY === 'true' && env.CONTEXT === 'deploy-preview' &&
    env.SITE_ID === QA_NETLIFY_SITE_ID && env.SITE_NAME === QA_NETLIFY_SITE_NAME &&
    /^[1-9][0-9]*$/.test(env.REVIEW_ID || '') &&
    env.DEPLOY_PRIME_URL === gitPreviewUrl &&
    env.RISCK_QA_ENVIRONMENT === 'true' &&
    env.RISCK_QA_BOOTSTRAP_NO_BILLING === 'true' &&
    env.RISCK_QA_NETLIFY_MANUAL_DRAFT === 'true' &&
    /^https:\/\/qa-manual-[a-f0-9]{8}--risck-qa-isolated\.netlify\.app$/.test(env.NEXT_PUBLIC_APP_URL || '');
  if (gitPreview) {
    env.NEXT_PUBLIC_APP_URL = gitPreviewUrl;
    delete env.RISCK_QA_NETLIFY_MANUAL_DRAFT;
  }
  const remoteUrl = resolveNetlifyQaRemoteDraftUrl(env);

  // Netlify CLI's *local* build is not a remotely attributed deployment.
  // It may supply placeholder DEPLOY_ID/URL values which must never be treated
  // as immutable provider evidence. Only the exact existing QA site, an explicit
  // local CLI marker and the protected deploy-preview context qualify.
  const localQaBuild = env.NETLIFY_LOCAL === 'true' &&
    env.NETLIFY === 'true' && env.CONTEXT === 'deploy-preview' &&
    env.SITE_ID === QA_NETLIFY_SITE_ID && env.SITE_NAME === QA_NETLIFY_SITE_NAME &&
    env.RISCK_QA_NETLIFY_MANUAL_DRAFT === 'true' &&
    env.RISCK_QA_BOOTSTRAP_NO_BILLING === 'true';

  if (!remoteUrl && localQaBuild) {
    // Never downgrade a real-looking but inconsistent remote deployment into
    // a local one. Local placeholder metadata must not reach Next.js or prebuild.
    if (/^[a-f0-9]{24,40}$/.test(env.DEPLOY_ID || '')) {
      return { env, errors: ['Unverified Netlify QA remote draft metadata'] };
    }
    delete env.DEPLOY_ID;
    delete env.DEPLOY_URL;
    delete env.DEPLOY_PRIME_URL;
  } else if (env.NETLIFY === 'true' && env.CONTEXT === 'deploy-preview' &&
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
