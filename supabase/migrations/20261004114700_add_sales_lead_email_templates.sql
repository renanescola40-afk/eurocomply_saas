-- Add sales lead transactional templates to the delivery-log allowlist.
-- Production observed SQLSTATE 23514 after sales lead notifications were introduced.

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
