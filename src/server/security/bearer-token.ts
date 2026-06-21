import { Buffer } from 'node:buffer';
import { timingSafeEqual } from 'node:crypto';

export type BearerTokenValidationOptions = {
  allowMissingTokenOutsideProduction?: boolean;
};

function safeEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.byteLength !== rightBuffer.byteLength) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function validateBearerToken(
  request: Request,
  configuredToken: string | undefined,
  options: BearerTokenValidationOptions = {},
) {
  const allowMissingTokenOutsideProduction = options.allowMissingTokenOutsideProduction ?? true;

  if (process.env.NODE_ENV !== 'production' && !configuredToken && allowMissingTokenOutsideProduction) {
    return true;
  }

  if (!configuredToken) {
    return false;
  }

  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return false;
  }

  return safeEquals(authorization.slice('Bearer '.length), configuredToken);
}
