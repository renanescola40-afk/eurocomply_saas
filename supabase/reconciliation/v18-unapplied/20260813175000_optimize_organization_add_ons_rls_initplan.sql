begin;

-- Preserve the existing tenant-scoped SELECT policy and browser role boundary
-- while evaluating auth.uid() once per statement instead of once per row.
alter policy "organization members can read add-ons"
on public.organization_add_ons
to authenticated
using (
  exists (
    select 1
    from public.organization_members as members
    where members.organization_id = organization_add_ons.organization_id
      and members.user_id = (select auth.uid())
  )
);

commit;
