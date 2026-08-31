import { describe, expect, it } from 'vitest';

import { isReservedNonDeliverableEmail } from '../src/lib/email/recipient-policy';

describe('transactional email recipient policy', () => {
  it.each([
    'user@example.com',
    'USER@EXAMPLE.ORG',
    'user@sub.example.net',
    'user@fixture.test',
    'user@fixture.invalid',
    'user@localhost',
    'user@proof.example',
  ])('classifies reserved non-deliverable test recipient %s', (email) => {
    expect(isReservedNonDeliverableEmail(email)).toBe(true);
  });

  it.each([
    'user@risckcomply.com',
    'user@example.co',
    'user@invalidated.com',
    'user@mytest.com',
  ])('does not suppress a deliverable-looking recipient %s', (email) => {
    expect(isReservedNonDeliverableEmail(email)).toBe(false);
  });

  it('does not hide malformed real input from the delivery provider path', () => {
    expect(isReservedNonDeliverableEmail('not-an-email')).toBe(false);
    expect(isReservedNonDeliverableEmail('@example.com')).toBe(false);
  });
});
