const RESERVED_NON_DELIVERABLE_EMAIL_DOMAINS = [
  'example.com',
  'example.org',
  'example.net',
  'example',
  'invalid',
  'localhost',
  'test',
] as const;

export function isReservedNonDeliverableEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.lastIndexOf('@');

  if (atIndex <= 0 || atIndex >= normalized.length - 1) return false;

  const domain = normalized.slice(atIndex + 1).replace(/\.$/, '');

  return RESERVED_NON_DELIVERABLE_EMAIL_DOMAINS.some(
    (reservedDomain) => domain === reservedDomain || domain.endsWith(`.${reservedDomain}`),
  );
}
