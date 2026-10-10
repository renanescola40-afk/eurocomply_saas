type TeamWorkflowCopy = {
  page: { eyebrow: string; title: string; body: string; badges: string[] };
  section: { eyebrow: string; title: string; body: string; verifyTitle: string; verifyBody: string; actionFailed: string; cancelled: string };
  invite: { title: string; body: string; email: string; role: string; selectRole: string; admin: string; editor: string; viewer: string; send: string; sending: string; error: string };
  access: { title: string; members: string; noMembers: string; you: string; member: string; role: string; remove: string; removeConfirm: (name: string) => string; pending: string; noPending: string; cancel: string; cancelConfirm: (email: string) => string };
  email: { subject: (organization: string) => string; title: (organization: string) => string; invitedBy: string; body: (organization: string, role: string) => string; cta: string; role: string; secureLink: string; header: string; footer: string };
};

const ENGLISH_COPY: TeamWorkflowCopy = {
    page: { eyebrow: 'Organization administration', title: 'Team and Enterprise access', body: 'Manage members and invitations, then supervise access controls and audit-ready operations.', badges: ['Tenant-scoped', 'Step-up protected', 'Access controlled', 'Audit evidence'] },
    section: { eyebrow: 'Team', title: 'Manage access', body: 'Invite teammates, review pending invitations, and keep access aligned with compliance responsibilities.', verifyTitle: 'Verify team management', verifyBody: 'Team invitations and access changes require MFA or enterprise identity verification.', actionFailed: 'Team action failed.', cancelled: 'Security verification was cancelled.' },
    invite: { title: 'Invite team member', body: 'Add collaborators to help manage compliance work.', email: 'Email', role: 'Role', selectRole: 'Select role', admin: 'Admin', editor: 'Editor', viewer: 'Viewer', send: 'Send invitation', sending: 'Sending...', error: 'Could not send invitation.' },
    access: { title: 'Team access', members: 'Members', noMembers: 'No team members found.', you: 'You', member: 'Team member', role: 'Role', remove: 'Remove', removeConfirm: (name) => `Remove ${name} from this organization?`, pending: 'Pending invitations', noPending: 'No pending invitations.', cancel: 'Cancel', cancelConfirm: (email) => `Cancel the invitation for ${email}?` },
    email: { subject: (org) => `Invitation to join ${org} on Risck Comply`, title: (org) => `Join ${org} on Risck Comply`, invitedBy: 'You were invited', body: (org, role) => `You were invited to join ${org} as ${role}.`, cta: 'Review invitation', role: 'Role', secureLink: 'Use the secure invitation link below. Do not forward this email.', header: 'AI governance operations for growing teams', footer: 'Message sent by Risck Comply.' },
  };

export function getTeamWorkflowCopy(_locale: string): TeamWorkflowCopy {
  return ENGLISH_COPY;
}
