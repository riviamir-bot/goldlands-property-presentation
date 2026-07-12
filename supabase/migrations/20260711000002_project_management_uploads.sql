alter table public.project_images
  add column if not exists original_name text,
  add column if not exists mime_type text,
  add column if not exists size_bytes bigint not null default 0;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'project-media',
    'project-media',
    false,
    26214400,
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'project-documents',
    'project-documents',
    false,
    26214400,
    array[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/csv',
      'application/csv'
    ]
  )
on conflict (id) do update
set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists goldlands_storage_project_files_select on storage.objects;
drop policy if exists goldlands_storage_project_files_insert_admin on storage.objects;
drop policy if exists goldlands_storage_project_files_update_admin on storage.objects;
drop policy if exists goldlands_storage_project_files_delete_admin on storage.objects;

create policy goldlands_storage_project_files_select
on storage.objects
for select
to authenticated
using (
  bucket_id in ('project-media', 'project-documents')
  and public.current_profile_role() in ('admin', 'sales', 'viewer')
  and (storage.foldername(name))[1] = 'projects'
  and exists (
    select 1
    from public.projects
    where projects.id::text = (storage.foldername(name))[2]
      and projects.is_active = true
  )
);

create policy goldlands_storage_project_files_insert_admin
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('project-media', 'project-documents')
  and public.current_profile_role() = 'admin'
  and (storage.foldername(name))[1] = 'projects'
  and exists (
    select 1
    from public.projects
    where projects.id::text = (storage.foldername(name))[2]
      and projects.is_active = true
  )
);

create policy goldlands_storage_project_files_update_admin
on storage.objects
for update
to authenticated
using (
  bucket_id in ('project-media', 'project-documents')
  and public.current_profile_role() = 'admin'
  and (storage.foldername(name))[1] = 'projects'
  and exists (
    select 1
    from public.projects
    where projects.id::text = (storage.foldername(name))[2]
      and projects.is_active = true
  )
)
with check (
  bucket_id in ('project-media', 'project-documents')
  and public.current_profile_role() = 'admin'
  and (storage.foldername(name))[1] = 'projects'
  and exists (
    select 1
    from public.projects
    where projects.id::text = (storage.foldername(name))[2]
      and projects.is_active = true
  )
);

create policy goldlands_storage_project_files_delete_admin
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('project-media', 'project-documents')
  and public.current_profile_role() = 'admin'
  and (storage.foldername(name))[1] = 'projects'
  and exists (
    select 1
    from public.projects
    where projects.id::text = (storage.foldername(name))[2]
      and projects.is_active = true
  )
);
