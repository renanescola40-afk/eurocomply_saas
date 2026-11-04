// Only construct a CLI invocation; importing this module never performs a rollback.
// The Vercel CLI reads VERCEL_TOKEN from its environment. Do not pass secrets in argv.
export function buildVercelCliInvocation({ args, token, version, env = {} }) {
  if (!Array.isArray(args) || args.length !== 2 || !['rollback', 'promote'].includes(args[0])) {
    throw new Error('unsupported_vercel_rollback_operation');
  }
  if (typeof token !== 'string' || token.trim() === '') {
    throw new Error('vercel_token_missing');
  }
  if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error('vercel_cli_version_not_pinned');
  }
  let deployment;
  try {
    deployment = new URL(args[1]);
  } catch {
    throw new Error('invalid_vercel_deployment_url');
  }
  if (deployment.protocol !== 'https:' || !deployment.hostname.endsWith('.vercel.app')
      || deployment.hostname === 'vercel.app' || deployment.pathname !== '/'
      || deployment.username || deployment.password || deployment.port
      || deployment.search || deployment.hash) {
    throw new Error('invalid_vercel_deployment_url');
  }
  return {
    command: 'npx',
    argv: ['--yes', `vercel@${version}`, args[0], deployment.href, '--yes'],
    options: {
      encoding: 'utf8',
      env: { ...env, VERCEL_TOKEN: token },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  };
}
