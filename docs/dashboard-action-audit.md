# Dashboard action audit

This checklist tracks the current status of dashboard buttons, links and actions.

## Global checks

- No indexed `href="#"` usage found.
- No indexed `TODO` usage found.
- No indexed `coming soon` usage found.
- No indexed `placeholder` usage found.
- No remaining indexed imports from old auth/query paths.
- No remaining indexed `organization.organization.id` usage.

## Main dashboard

Verified:

- Metric cards link to relevant drill-down pages.
- Compliance score links to Reports.
- Open tasks links to Tasks.
- Risks links to Risks.
- Vendor review items link to Vendors.
- Expiring document items link to Documents.
- Task focus items link to Tasks.
- Links preserve locale through the page-provided base path.

Manual QA still required:

- Confirm every card opens the expected localized route after login.
- Confirm dashboard trend cards render with and without snapshots.

## Tasks

Verified:

- Create task form calls a real server action.
- Delete task button calls a real server action with confirmation.
- CSV export button points to a real protected export route.
- Page revalidates task and dashboard routes after mutations.

Manual QA still required:

- Create a task from the UI.
- Delete a task from the UI.
- Download CSV and inspect rows.

## Documents

Verified:

- Upload form calls a real server action.
- Download button creates a signed URL through a server action.
- Signed URLs expire after five minutes.
- Delete button calls a real server action with confirmation.
- CSV export button points to a real protected export route.
- Storage path is checked against organization scope before signing URLs.

Manual QA still required:

- Upload a safe fixture file.
- Download through signed URL.
- Delete uploaded file.
- Confirm the Supabase storage bucket is private.

## Vendors

Verified:

- Create vendor form calls a real server action.
- Delete vendor button calls a real server action with confirmation.
- CSV export button points to a real protected export route.
- Page revalidates vendor and dashboard routes after mutations.

Manual QA still required:

- Create a vendor.
- Delete a vendor.
- Export vendor CSV.

## Risks

Verified:

- Create risk form calls a real server action.
- Delete risk button calls a real server action with confirmation.
- CSV export button points to a real protected export route.
- Page revalidates risk and dashboard routes after mutations.

Manual QA still required:

- Create a risk.
- Delete a risk.
- Export risk CSV.

## Templates

Verified:

- Template to task calls a real server action.
- Template to document calls a real server action.
- Server actions revalidate the current user and organization.
- Successful actions redirect to the created-resource area.

Manual QA still required:

- Generate a task from a template.
- Generate a document from a template.
- Confirm document metadata records template origin.

## Reports

Verified:

- Printable report link points to a real page.
- Print button uses browser print/save PDF flow.
- Executive, tasks, risks, vendors and documents CSV routes exist.
- CSV routes use current auth and organization queries.
- CSV routes are protected by distributed rate limiting.

Manual QA still required:

- Open printable report.
- Save as PDF through browser print.
- Download each CSV from Reports.

## Team

Verified:

- Invite member form calls a real server action.
- Invite roles are limited to admin and member.
- Cancel invitation calls a real server action with confirmation.
- Remove member calls a real server action with confirmation.
- Self-removal is blocked.
- Removing the last owner is blocked.
- Team actions write audit logs.

Manual QA still required:

- Invite a member.
- Cancel a pending invitation.
- Remove a non-owner test member.

## Billing

Verified:

- Checkout calls a real Stripe Checkout server action.
- Customer Portal calls a real Stripe portal server action.
- Server actions revalidate current user and organization.
- Current plan button opens the customer portal instead of restarting checkout.
- Upgrade and switch buttons go to Checkout.

Manual QA still required:

- Start checkout for each paid plan.
- Open customer portal with a Stripe customer.
- Confirm webhook updates subscription state.
