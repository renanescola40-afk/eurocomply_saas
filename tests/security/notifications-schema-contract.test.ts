import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  tryCreateAdminClient: vi.fn(),
  from: vi.fn(),
  insert: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  tryCreateAdminClient: mocks.tryCreateAdminClient,
}));

describe('notifications production schema contract', () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.tryCreateAdminClient.mockReset();
    mocks.from.mockReset();
    mocks.insert.mockReset();

    mocks.insert.mockResolvedValue({ error: null });
    mocks.from.mockReturnValue({ insert: mocks.insert });
    mocks.tryCreateAdminClient.mockReturnValue({ from: mocks.from });
  });

  it('sends only current production columns to the notifications table', async () => {
    const { createNotification } = await import('../../src/server/queries/notifications');

    const result = await createNotification({
      organizationId: '00000000-0000-0000-0000-000000000001',
      userId: '00000000-0000-0000-0000-000000000002',
      type: 'invite',
      title: 'Team invitation',
      message: 'Team invitation sent with Editor permission.',
      metadata: {
        source: 'team_invites_api',
        invitationId: 'invitation-123',
      },
    });

    expect(result).toEqual({ persisted: true });
    expect(mocks.from).toHaveBeenCalledWith('notifications');
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    expect(mocks.insert).toHaveBeenCalledWith({
      organization_id: '00000000-0000-0000-0000-000000000001',
      user_id: '00000000-0000-0000-0000-000000000002',
      title: 'Team invitation',
      type: 'info',
      message: 'Team invitation sent with Editor permission.',
    });

    const insertedPayload = mocks.insert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(Object.keys(insertedPayload).sort()).toEqual([
      'message',
      'organization_id',
      'title',
      'type',
      'user_id',
    ]);
    expect(insertedPayload).not.toHaveProperty('metadata');
  });

  it('maps alert and document upload application types to persisted notification types', async () => {
    const { createNotification } = await import('../../src/server/queries/notifications');

    await createNotification({
      organizationId: '00000000-0000-0000-0000-000000000001',
      type: 'alert',
      message: 'Action required.',
    });
    expect(mocks.insert).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'warning' }));

    await createNotification({
      organizationId: '00000000-0000-0000-0000-000000000001',
      type: 'document_uploaded',
      message: 'Document uploaded.',
    });
    expect(mocks.insert).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'success' }));
  });
});
