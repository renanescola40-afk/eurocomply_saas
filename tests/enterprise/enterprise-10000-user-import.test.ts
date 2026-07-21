import { describe, expect, it } from 'vitest';

import {
  digestEnterpriseProvisioningRows,
  parseEnterpriseProvisioningCsv,
} from '../../src/server/enterprise/bulk-provisioning';

describe('enterprise 10,000 user import boundary', () => {
  it('accepts exactly 10,000 normalized rows with a stable batch digest', () => {
    const csv = ['email,role,seat_type'];
    for (let index = 0; index < 10_000; index += 1) {
      const seatType = index % 20 === 0 ? 'full' : index % 5 === 0 ? 'viewer' : 'participant';
      const role = seatType === 'viewer' ? 'viewer' : index % 200 === 0 ? 'admin' : 'editor';
      csv.push(`employee-${index}@enterprise.example,${role},${seatType}`);
    }

    const rows = parseEnterpriseProvisioningCsv({ csv: csv.join('\n') });
    expect(rows).toHaveLength(10_000);
    expect(rows[0]).toEqual({
      email: 'employee-0@enterprise.example',
      role: 'admin',
      seatType: 'full',
    });
    expect(rows.at(-1)?.email).toBe('employee-9999@enterprise.example');
    expect(digestEnterpriseProvisioningRows(rows)).toMatch(/^[a-f0-9]{64}$/);
  });

  it('keeps every generated email unique after normalization', () => {
    const csv = ['work_email'];
    for (let index = 0; index < 10_000; index += 1) {
      csv.push(`USER-${index}@ENTERPRISE.EXAMPLE`);
    }

    const rows = parseEnterpriseProvisioningCsv({
      csv: csv.join('\n'),
      defaultRole: 'editor',
      defaultSeatType: 'participant',
    });

    expect(new Set(rows.map((row) => row.email)).size).toBe(10_000);
    expect(rows[42]).toEqual({
      email: 'user-42@enterprise.example',
      role: 'editor',
      seatType: 'participant',
    });
  });
});
