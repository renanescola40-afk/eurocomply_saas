# Access control

Status: enterprise access-control overview.

EuroComply uses authenticated sessions and organization-scoped authorization. The current role model includes owner, admin, editor, member and viewer. Application RBAC and database tenant-boundary controls work together: server-side code checks membership and permissions, while RLS is the intended database-level boundary for authenticated access.

Enterprise SSO, tenant-enforced MFA and custom fine-grained roles must not be claimed as available unless implemented and evidenced.
