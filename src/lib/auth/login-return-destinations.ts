/**
 * Explicit post-login destinations; every private route must still enforce its
 * own authentication and authorization server-side.
 *
 * The profile page sends anonymous users to login with next=/{locale}/profile.
 * Omitting profile here silently sends them to onboarding after sign-in.
 */
export function isAllowedLoginReturnDestination(value: string, locale: string): boolean {
  const allowed = [
    `/${locale}/onboarding`,
    `/${locale}/dashboard/organizations`,
    `/${locale}/dashboard/observability`,
    `/${locale}/checkout`,
    `/${locale}/profile`,
  ];
  return allowed.some((path) =>
    value === path || value.startsWith(`${path}/`) || value.startsWith(`${path}?`));
}
