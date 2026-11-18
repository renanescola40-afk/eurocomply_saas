'use client';

import { useEffect, useState } from 'react';

import { TeamActionButton } from './team-action-button';

export type TeamRole = 'viewer' | 'member' | 'editor' | 'admin' | 'owner';

const ROLE_OPTIONS: readonly TeamRole[] = ['viewer', 'member', 'editor', 'admin', 'owner'];

type TeamMemberRoleEditorProps = {
  memberId: string;
  displayName: string;
  currentRole: string;
  canAssignOwner: boolean;
  canAssignAdmin: boolean;
  onChangeRole: (role: TeamRole) => Promise<void> | void;
};

function parseRole(value: string): TeamRole | null {
  const role = value.toLowerCase();
  return ROLE_OPTIONS.find((item) => item === role) ?? null;
}

export function TeamMemberRoleEditor({
  memberId,
  displayName,
  currentRole,
  canAssignOwner,
  canAssignAdmin,
  onChangeRole,
}: TeamMemberRoleEditorProps) {
  const actualRole = parseRole(currentRole);
  const [selectedRole, setSelectedRole] = useState<TeamRole | null>(actualRole);

  useEffect(() => {
    setSelectedRole(actualRole);
  }, [actualRole]);

  // Unknown roles must not become assignable permissions.
  if (!actualRole) return <span className="text-xs text-amber-300">Role review required</span>;

  const allowedRoles = ROLE_OPTIONS.filter((role) => (
    (role !== 'owner' || canAssignOwner || role === actualRole)
    && (role !== 'admin' || canAssignAdmin || role === actualRole)
  ));

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <label htmlFor={`member-role-${memberId}`} className="sr-only">Change role for {displayName}</label>
      <select
        id={`member-role-${memberId}`}
        className="max-w-40 rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100"
        value={selectedRole ?? actualRole}
        onChange={(event) => setSelectedRole(event.target.value as TeamRole)}
        aria-label={`Change role for ${displayName}`}
      >
        {allowedRoles.map((role) => <option key={role} value={role}>{role}</option>)}
      </select>
      {selectedRole && selectedRole !== actualRole && allowedRoles.includes(selectedRole) ? (
        <TeamActionButton
          message={`Change ${displayName}'s role from ${actualRole} to ${selectedRole}?`}
          onConfirm={() => onChangeRole(selectedRole)}
        >
          Save role
        </TeamActionButton>
      ) : null}
    </div>
  );
}
