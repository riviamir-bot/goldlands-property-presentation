create or replace function public.current_profile_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and is_active = true
$$;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email, ''),
    'sales'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.apartments enable row level security;
alter table public.project_materials enable row level security;
alter table public.project_images enable row level security;
alter table public.project_documents enable row level security;
alter table public.technical_specifications enable row level security;
alter table public.client_share_links enable row level security;
alter table public.client_share_link_apartments enable row level security;

create policy profiles_admin_all
on public.profiles
for all
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

create policy profiles_read_own
on public.profiles
for select
using (id = auth.uid());

create policy projects_admin_all
on public.projects
for all
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

create policy projects_sales_read_active
on public.projects
for select
using (
  is_active = true
  and public.current_profile_role() in ('sales', 'viewer')
);

create policy apartments_admin_all
on public.apartments
for all
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

create policy apartments_sales_read_active_projects
on public.apartments
for select
using (
  public.current_profile_role() in ('sales', 'viewer')
  and exists (
    select 1
    from public.projects
    where projects.id = apartments.project_id
      and projects.is_active = true
  )
);

create policy project_materials_admin_all
on public.project_materials
for all
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

create policy project_materials_sales_read_active_projects
on public.project_materials
for select
using (
  public.current_profile_role() in ('sales', 'viewer')
  and exists (
    select 1
    from public.projects
    where projects.id = project_materials.project_id
      and projects.is_active = true
  )
);

create policy project_images_admin_all
on public.project_images
for all
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

create policy project_images_sales_read_active_projects
on public.project_images
for select
using (
  public.current_profile_role() in ('sales', 'viewer')
  and exists (
    select 1
    from public.projects
    where projects.id = project_images.project_id
      and projects.is_active = true
  )
);

create policy project_documents_admin_all
on public.project_documents
for all
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

create policy project_documents_sales_read_active_projects
on public.project_documents
for select
using (
  public.current_profile_role() in ('sales', 'viewer')
  and exists (
    select 1
    from public.projects
    where projects.id = project_documents.project_id
      and projects.is_active = true
  )
);

create policy technical_specifications_admin_all
on public.technical_specifications
for all
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

create policy technical_specifications_sales_read_active_projects
on public.technical_specifications
for select
using (
  public.current_profile_role() in ('sales', 'viewer')
  and exists (
    select 1
    from public.projects
    where projects.id = technical_specifications.project_id
      and projects.is_active = true
  )
);

create policy client_share_links_admin_all
on public.client_share_links
for all
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

create policy client_share_links_sales_read_own
on public.client_share_links
for select
using (
  public.current_profile_role() = 'sales'
  and created_by = auth.uid()
);

create policy client_share_links_sales_insert_own
on public.client_share_links
for insert
with check (
  public.current_profile_role() = 'sales'
  and created_by = auth.uid()
);

create policy client_share_links_sales_update_own
on public.client_share_links
for update
using (
  public.current_profile_role() = 'sales'
  and created_by = auth.uid()
)
with check (
  public.current_profile_role() = 'sales'
  and created_by = auth.uid()
);

create policy client_share_link_apartments_admin_all
on public.client_share_link_apartments
for all
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

create policy client_share_link_apartments_sales_read_own
on public.client_share_link_apartments
for select
using (
  public.current_profile_role() = 'sales'
  and exists (
    select 1
    from public.client_share_links
    where client_share_links.id = client_share_link_apartments.share_link_id
      and client_share_links.created_by = auth.uid()
  )
);

create policy client_share_link_apartments_sales_insert_own
on public.client_share_link_apartments
for insert
with check (
  public.current_profile_role() = 'sales'
  and exists (
    select 1
    from public.client_share_links
    where client_share_links.id = client_share_link_apartments.share_link_id
      and client_share_links.created_by = auth.uid()
  )
);
