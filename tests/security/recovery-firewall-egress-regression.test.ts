import { describe, expect, it } from 'vitest';

import { dockerUserArgs } from '../../scripts/recovery/manage-ephemeral-recovery-database.mjs';

describe('recovery Docker firewall egress regression', () => {
  it('matches only traffic originally addressed to the published recovery port', () => {
    const rule = dockerUserArgs(31873, 5432, 'risck-recovery-test');

    expect(rule).toEqual([
      'DOCKER-USER',
      '-p', 'tcp',
      '-m', 'conntrack',
      '--ctdir', 'ORIGINAL',
      '--ctorigdstport', '31873',
      '--dport', '5432',
      '-m', 'comment', '--comment', 'risck-recovery-test',
      '-j', 'DROP',
    ]);

    expect(rule.join(' ')).toContain('--ctorigdstport 31873');
    expect(rule.join(' ')).not.toBe(
      'DOCKER-USER -p tcp --dport 5432 -m comment --comment risck-recovery-test -j DROP',
    );
  });

  it('fails closed on invalid firewall ports', () => {
    expect(() => dockerUserArgs(0, 5432, 'risck-recovery-test')).toThrow('host port is invalid');
    expect(() => dockerUserArgs(31873, 0, 'risck-recovery-test')).toThrow('container port is invalid');
  });
});
