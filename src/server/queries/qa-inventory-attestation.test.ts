import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { signQaInventoryCall } from './qa-inventory-attestation';

describe('QA inventory transaction attestation', () => {
  const secret = 'a'.repeat(64);
  const context = { transactionId: '12345', backendPid: 42, organizationId: 'org', claims: { sub: 'actor', aal: 'aal2' } };
  it('binds exact bytes to the operation, arguments, transaction, actor and tenant', () => {
    const [payload, mac] = signQaInventoryCall(secret, context, 'mutate', { patch: { name: 'one' } });
    const digest = (value: string) => createHmac('sha256', secret).update(value, 'utf8').digest('hex');
    expect(digest(payload)).toBe(mac);
    for (const replacement of [
      payload.replace('12345','12346'), payload.replace('"backendPid":42','"backendPid":43'),
      payload.replace('"org"','"other"'), payload.replace('"actor"','"other"'),
      payload.replace('"mutate"','"append"'), payload.replace('"one"','"two"'),
    ]) { expect(replacement).not.toBe(payload); expect(digest(replacement)).not.toBe(mac); }
    expect(createHmac('sha256','b'.repeat(64)).update(payload).digest('hex')).not.toBe(mac);
  });
  it('rejects malformed key or invalid transaction binding', () => {
    expect(() => signQaInventoryCall('bad',context,'head',{})).toThrow('qa_inventory_attestation_unavailable');
    expect(() => signQaInventoryCall(secret,{...context,transactionId:'invalid'},'head',{})).toThrow('qa_inventory_attestation_unavailable');
    expect(() => signQaInventoryCall(secret,{...context,backendPid:0},'head',{})).toThrow('qa_inventory_attestation_unavailable');
  });
});
