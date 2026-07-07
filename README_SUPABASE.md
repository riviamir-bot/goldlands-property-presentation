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

Future buckets should stay private by default and use signed URLs:

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
