export function isAuthorizedInternalCronRequest(request: Request) {
  const expectedSecrets = [process.env.CRON_SECRET, process.env.INTERNAL_CRON_SECRET].filter(Boolean);

  if (expectedSecrets.length === 0) {
    return false;
  }

  const authorization = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const internalHeader = request.headers.get('x-internal-cron-secret');

  return expectedSecrets.some((secret) => secret === authorization || secret === internalHeader);
}
