import { describe, expect, it } from 'vitest';

import {
  digestEnterpriseProvisioningRows,
  parseEnterpriseProvisioningCsv,
} from '../../src/server/enterprise/bulk-provisioning';

describe('enterprise bulk provisioning CSV', () => {
  it('parses quoted fields and explicit seat mappings', () => {
    const rows = parseEnterpriseProvisioningCsv({
      csv: [
        'email,role,seat_type',
        '"admin@example.test",admin,full',
        '"person+ops@example.test",editor,participant',
        'viewer@example.test,viewer,viewer',
      ].join('\n'),
    });

    expect(rows).toEqual([
      { email: 'admin@example.test', role: 'admin', seatType: 'full' },
      { email: 'person+ops@example.test', role: 'editor', seatType: 'participant' },
      { email: 'viewer@example.test', role: 'viewer', seatType: 'viewer' },
    ]);
  });

  it('applies safe defaults when optional columns are omitted', () => {
    expect(parseEnterpriseProvisioningCsv({
      csv: 'work_email\nfirst@example.test\nsecond@example.test',
      defaultRole: 'editor',
      defaultSeatType: 'participant',
    })).toEqual([
      { email: 'first@example.test', role: 'editor', seatType: 'participant' },
      { email: 'second@example.test', role: 'editor', seatType: 'participant' },
    ]);
  });

  it('rejects duplicate normalized email addresses', () => {
    expect(() => parseEnterpriseProvisioningCsv({
      csv: 'email\nUser@Example.test\nuser@example.test',
    })).toThrow('enterprise_csv_duplicate_email');
  });

  it('rejects imports larger than the contractual job maximum', () => {
    const rows = ['email'];
    for (let index = 0; index < 10_001; index += 1) {
      rows.push(`user-${index}@example.test`);
    }

    expect(() => parseEnterpriseProvisioningCsv({ csv: rows.join('\n') }))
      .toThrow('enterprise_csv_row_limit_exceeded');
  });

  it('creates a stable digest for idempotent job retries', () => {
    const rows = [
      { email: 'user@example.test', role: 'editor' as const, seatType: 'participant' as const },
    ];

    expect(digestEnterpriseProvisioningRows(rows)).toMatch(/^[a-f0-9]{64}$/);
    expect(digestEnterpriseProvisioningRows(rows)).toBe(digestEnterpriseProvisioningRows(rows));
  });
});
