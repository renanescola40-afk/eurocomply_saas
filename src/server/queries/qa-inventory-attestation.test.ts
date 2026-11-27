import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
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

describe('QA inventory SQL attestation boundary (source contract, not runtime)', () => {
  const sql = readFileSync('scripts/qa/qa-2764-inventory-transaction-install.sql', 'utf8');
  it('checks attestation before every privileged operation and verifies both JWT GUC aliases', () => {
    for (const name of ['head','mutate','append']) {
      const body = sql.split('AS $' + name + '$')[1]?.split('END $' + name + '$')[0];
      expect(body).toBeTruthy();
      expect(body!.indexOf("qa_inventory_verify_attestation(p_payload,p_mac,p_organization_id,'" + name + "'")).toBeGreaterThan(-1);
      expect(body!.indexOf('qa_inventory_verify_attestation(')).toBeLessThan(body!.indexOf('qa_require_ai_inventory_actor('));
    }
    for (const marker of ["set_config('request.jwt.claim',","set_config('request.jwt.claims',",
      "v_data->>'transactionId' IS DISTINCT FROM pg_catalog.txid_current()::text",
      "v_data->>'backendPid' IS DISTINCT FROM pg_catalog.pg_backend_pid()::text",
      "v_data->'args' IS DISTINCT FROM p_arguments","auth.jwt() IS DISTINCT FROM v_claims"]) expect(sql).toContain(marker);
  });
  it('verifies the audit hash and signature and denies direct secret access', () => {
    expect(sql).toContain("p_canonical::jsonb IS DISTINCT FROM (p_audit - ARRAY['eventHash','signature'])");
    expect(sql).toContain("extensions.hmac(pg_catalog.convert_to(v_hash,'UTF8')");
    expect(sql).toContain("has_table_privilege('qa_inventory_writer','vault.decrypted_secrets','SELECT')");
    expect(sql).toContain("has_schema_privilege('qa_inventory_writer','vault','USAGE')");
    expect(sql).not.toMatch(/GRANT EXECUTE ON FUNCTION app_private\.qa_inventory_verify_attestation/);
  });
});
