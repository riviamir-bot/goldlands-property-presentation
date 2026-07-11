# Supabase Setup

This project keeps localStorage as its reliable fallback while optionally using Supabase Auth, profiles, projects, and apartments when Supabase environment variables are configured.

## Create A Supabase Project

1. Go to https://supabase.com and create a new project.
2. Choose the organization, project name, region, and database password.
3. After the project is ready, open Project Settings -> API.
4. Copy the Project URL and anon public key.

## Environment Variables

Create a local `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Paste the values:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

If these variables are missing, `src/lib/supabaseClient.ts` exports `supabase = null`, and the current localStorage prototype keeps working.

## Run Migrations Later

The migration files live in `supabase/migrations/`.

When the Supabase CLI is added to the workflow, the typical flow will be:

```bash
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

No migration is required to run the current local prototype.

## Seed Demo Projects And Apartments

After the migrations are applied, you can seed the current mock projects and apartments from the Supabase Dashboard:

1. Open your Supabase project.
2. Go to SQL Editor.
3. Open `supabase/seed_mock_projects_apartments.sql` locally.
4. Paste the SQL into the editor.
5. Click Run.

The seed is idempotent. It upserts the current demo rows in:

- `projects`
- `apartments`

It does not seed storage, uploads, documents, images, auth users, or profile roles.

## Apply The Storage Path Migration

Before using project logo or main image uploads, apply:

```text
supabase/migrations/20260708000000_project_file_paths.sql
```

This adds nullable stable path columns to `projects`:

- `project_logo_path`
- `main_image_path`

The app does not store expiring signed URLs in these columns. It stores stable Storage object paths and requests fresh signed URLs at runtime.

## Apply The Complete Project Mapping Migration

Before using the full document import and project file management workflow, apply:

```text
supabase/migrations/20260711000000_complete_project_supabase_mapping.sql
```

This keeps existing data and adds missing nullable/metadata columns:

- project planning fields such as block, parcel, licensing route, planning status, developer units, owner units, and imported technical notes
- file association and target fields for `project_images`
- file association and target fields for `project_documents`

## Create The First Admin User

This milestone uses Supabase Auth email/password login and reads the matching row from `profiles`.

1. Open Supabase Dashboard.
2. Go to Authentication -> Users.
3. Click Add user.
4. Create the first user with email and password.
5. Copy that user's UUID from the Users table.

The migration trigger creates new profiles with the default `sales` role. To make the first user an admin, open SQL Editor and run:

```sql
update public.profiles
set
  full_name = 'GOLDLANDS Admin',
  role = 'admin',
  is_active = true
where id = 'paste-auth-user-uuid-here';
```

If the profile row was not created yet, insert it manually:

```sql
insert into public.profiles (id, full_name, role, is_active)
values ('paste-auth-user-uuid-here', 'GOLDLANDS Admin', 'admin', true)
on conflict (id) do update set
  full_name = excluded.full_name,
  role = excluded.role,
  is_active = excluded.is_active;
```

Supported profile roles:

- `admin`: can view project management, readiness/missing materials, and add/edit/delete project data.
- `sales`: can view project presentation screens only.
- `viewer`: read-only presentation access.

Never place `service_role`, `secret`, or `sb_secret_...` keys in `.env`, Vercel frontend environment variables, or any Vite variable. The browser must only use the Supabase Project URL and anon/publishable key.

## Tables

- `profiles`: application profile for each Supabase Auth user, including `admin`, `sales`, or `viewer` role.
- `projects`: main project record, including location, marketing copy, readiness fields, stats, and apartment mix.
- `apartments`: apartment inventory per project, including price, special price, status, areas, parking, storage, direction, plan status, and notes.
- `project_materials`: readiness and manual metadata for project content areas such as details, logo, inventory, price list, location, FAQ, and documents.
- `project_images`: image metadata and storage paths for logos, main images, renderings, lobby, surroundings, and other image assets.
- `project_documents`: document metadata and storage paths for apartment plans, floor plans, price lists, brochures, technical specs, and sales decks.
- `technical_specifications`: structured technical spec sections and bullet items per project.
- `client_share_links`: future share-link records with selected sections, price visibility, expiry, revocation, and view tracking.
- `client_share_link_apartments`: apartments included in a client share link, including whether to include the apartment plan.

## Draft Storage Structure

Buckets should stay private by default and use signed URLs:

```text
project-media/
  projects/{project_id}/logo/{filename}
  projects/{project_id}/images/main/{filename}
  projects/{project_id}/images/renderings/exterior/{filename}
  projects/{project_id}/images/renderings/interior/{filename}
  projects/{project_id}/images/renderings/lobby/{filename}
  projects/{project_id}/images/renderings/surroundings/{filename}

project-documents/
  projects/{project_id}/apartments/{apartment_id}/plans/{filename}
  projects/{project_id}/floor-plans/{filename}
  projects/{project_id}/price-lists/{yyyy-mm-dd}/{filename}
  projects/{project_id}/brochures/{filename}
  projects/{project_id}/technical/{filename}
  projects/{project_id}/sales/{filename}
```

## Create Storage Buckets

Create these buckets in Supabase Dashboard -> Storage:

- `project-media`
- `project-documents`

Recommended privacy:

- Keep both buckets private.
- Do not mark them public unless you intentionally want anyone with a URL to access project materials.
- Use signed URLs from the browser client.

You can also create/update the buckets from SQL Editor:

```sql
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
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ]
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
```

## Storage Policies

The frontend must only use the Supabase URL and anon/publishable key. Never use the service role key in Vite or Vercel frontend env vars.

Run these policies once from SQL Editor after the buckets exist. They keep uploads/deletes admin-only and allow authenticated active project reads for `admin`, `sales`, and `viewer` profiles:

```sql
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
```

## Storage Upload Runtime

Admin uploads now use `src/services/storageService.ts`.

Uploads write the file into Storage and then insert metadata:

- Images go to `project_images`.
- Documents go to `project_documents`.
- File association and target changes update metadata rows without uploading the file again.
- File deletion removes the Storage object and its metadata row.
- Project logo uploads also update `projects.project_logo_path`.
- Main image uploads also update `projects.main_image_path`.
- Apartment plan uploads also mark the apartment plan status as attached.

The app requests signed URLs when reading project data. If Storage, bucket policies, or RLS block access, the app logs a warning and keeps using localStorage/project metadata fallback instead of crashing.

To verify an upload:

1. Open Supabase Dashboard -> Storage.
2. Open `project-media` or `project-documents`.
3. Confirm the file path starts with `projects/{project_id}/...`.
4. Open Table Editor -> `project_images` or `project_documents`.
5. Confirm the metadata row has the same `storage_bucket` and `storage_path`.
6. For logo/main image uploads, open Table Editor -> `projects` and confirm `project_logo_path` or `main_image_path` was updated.

## One-Time Local Data Migration

Admin users can open the project management screen and use "העברה ל-Supabase".

The migration:

- keeps localStorage intact
- upserts projects by UUID id when possible
- falls back to matching by project name and address
- upserts apartments by UUID id when possible, otherwise by project and apartment number
- does not upload blob/data URLs as permanent files

## Current Runtime

`useProjectsStore.ts` remains the only app-facing runtime interface and continues to use localStorage key:

```text
goldlands.presentation.demo.v1
```

Runtime behavior:

1. The app starts immediately from localStorage.
2. If localStorage is empty or invalid, it falls back to `mockData`.
3. If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` exist, users can log in with Supabase Auth email/password.
4. After login, the app reads the matching `profiles` row to detect the user's role.
5. After a real profile is loaded, the app retries reading `projects` and `apartments` from Supabase.
6. If Supabase returns valid non-empty project data, that state is used and cached back to localStorage.
7. If Supabase is unavailable, blocked by RLS, or empty, the app keeps using localStorage/mockData.
8. Project and apartment edits save to localStorage immediately.
9. When Supabase has been successfully loaded, the app also tries to write project and apartment edits to Supabase.
10. If a Supabase write fails, the local edit remains and the app logs a warning.
11. Project material uploads require Supabase Storage, the private buckets, and authenticated `admin` RLS access.
12. If Storage upload or signed URL creation fails, the local app remains usable and shows/logs a clear warning.

If Supabase env vars are missing or Auth/profile loading is unavailable, the login screen offers local demo mode. Demo mode uses the local admin fallback user and does not attempt Supabase project writes.

Legacy fallback behavior still applies:

1. If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are missing, `src/lib/supabaseClient.ts` exports `supabase = null`.
2. The app remains usable with mock/localStorage project data.
3. No service role or backend-only key is required in the frontend.

RLS remains enabled. Browser reads/writes are allowed only when the authenticated user's profile role satisfies the existing RLS policies.

The repository files are:

- `src/services/projectsRepository.ts`: common repository interface.
- `src/services/localProjectsRepository.ts`: localStorage-compatible implementation.
- `src/services/supabaseProjectsRepository.ts`: Supabase read/write implementation for `projects` and `apartments`.
