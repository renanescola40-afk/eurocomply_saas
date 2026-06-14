import { createHash } from 'node:crypto';

import { stableJsonStringify } from './stable-json';

export function stableSha256(value: unknown): string {
  return createHash('sha256').update(stableJsonStringify(value)).digest('hex');
}
