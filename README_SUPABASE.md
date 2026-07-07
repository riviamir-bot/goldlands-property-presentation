# Supabase Setup

This project is still running on local React state and localStorage. The Supabase files in this milestone prepare the next integration step, but the app does not require Supabase credentials yet.

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
3. If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` exist, the app tries to read `projects` and `apartments` from Supabase in the background.
4. If Supabase returns valid non-empty project data, that state is used and cached back to localStorage.
5. If Supabase is unavailable, blocked by RLS, or empty, the app keeps using localStorage/mockData.
6. Project and apartment edits save to localStorage immediately.
7. When Supabase has been successfully loaded, the app also tries to write project and apartment edits to Supabase.
8. If a Supabase write fails, the local edit remains and the app logs a warning.

Because full Supabase Auth is not wired yet, RLS may block browser reads or writes even when tables exist and env vars are configured. That is expected for this milestone. Do not expose `service_role`, `secret`, or `sb_secret_...` keys in the browser to bypass RLS.

The repository files are:

- `src/services/projectsRepository.ts`: common repository interface.
- `src/services/localProjectsRepository.ts`: localStorage-compatible implementation.
- `src/services/supabaseProjectsRepository.ts`: Supabase read/write implementation for `projects` and `apartments`.
