-- Extend transactional email audit logging for commercial sales lead emails.
-- Keeps the existing allowlist semantics while adding the two server-only
-- templates introduced by the sales contact workflow.

alter table public.email_delivery_logs
  drop constraint if exists email_delivery_logs_template_check;

alter table public.email_delivery_logs
  add constraint email_delivery_logs_template_check
  check (
    template in (
      'welcome_onboarding',
      'organization_created',
      'member_invited',
      'billing_started',
      'invoice_failed',
      'compliance_deadline_reminder',
      'export_ready',
      'security_alert',
      'sales_lead_internal',
      'sales_lead_acknowledgement',
      'trial_upgrade',
      'document_expiring',
      'vendor_review'
    )
  );

comment on constraint email_delivery_logs_template_check on public.email_delivery_logs
  is 'Allowlisted transactional email template identifiers, including sales lead notification and acknowledgement messages.';
