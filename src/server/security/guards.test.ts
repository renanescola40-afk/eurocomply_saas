/* eslint-disable */
// @ts-nocheck
import { describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  clerkClient: vi.fn(),
}));

vi.mock('@/server/queries/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/server/queries/current-organization', () => ({
  getCurrentOrganizationForUser: vi.fn(),
}));

vi.mock('@/server/clerk/organization-sync', () => ({
  syncClerkOrganizationToSupabase: vi.fn(),
}));

import { guardErrorResponse, SecurityGuardError } from './guards';

describe('security guard error responses', () => {
  it('returns no-store sanitized guard failures', async () => {
    const response = guardErrorResponse(new SecurityGuardError('ORGANIZATION_REQUIRED', 'Organization context required', 403));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('pragma')).toBe('no-cache');
    expect(body).toEqual({ error: 'Organization context required', code: 'ORGANIZATION_REQUIRED' });
  });

  it('does not leak unexpected error details', async () => {
    const response = guardErrorResponse(new Error('database password leaked in stack'));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(body).toEqual({ error: 'Unexpected server error' });
    expect(JSON.stringify(body)).not.toContain('database password');
  });
});
