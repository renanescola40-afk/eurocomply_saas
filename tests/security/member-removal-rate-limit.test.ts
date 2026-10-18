import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const route=readFileSync('src/app/api/team/members/remove/route.ts','utf8');
const action=readFileSync('src/server/actions/members.ts','utf8');
describe('organization member removal rate limiting and bypass elimination',()=>{
  it('checks fail-closed team policy before member lookup and audited removal',()=>{
    expect(route).toContain("policy: 'team-management'");
    expect(route).toContain("action: 'team_member_remove'");
    expect(route).toContain("failureMode: 'fail-closed'");
    expect(route).toContain('requireTrustedMutation(request');
    expect(route.indexOf('requireTrustedMutation(request')).toBeLessThan(route.indexOf(".from('organization_members')"));
    expect(route.indexOf('requireTrustedMutation(request')).toBeLessThan(route.indexOf('removeMemberWithChainedAuditAtomic({'));
  });
  it('does not expose an unstepped Server Action for membership removal',()=>{
    const old=action.slice(action.indexOf('export async function removeOrganizationMember('));
    expect(old).toContain("throw actionError('Member removal requires the step-up protected API route.')");
    expect(old).not.toContain('remove_organization_member_atomic');
  });
});
