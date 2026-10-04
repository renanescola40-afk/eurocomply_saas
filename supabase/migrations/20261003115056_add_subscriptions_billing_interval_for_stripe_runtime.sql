alter table public.subscriptions
add column if not exists billing_interval text
check (billing_interval in ('month','year'));
