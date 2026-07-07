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

For now, `useProjectsStore.ts` remains the live runtime and continues to use localStorage key:

```text
goldlands.presentation.demo.v1
```

The new repository files are preparation only:

- `src/services/projectsRepository.ts`: common repository interface.
- `src/services/localProjectsRepository.ts`: localStorage-compatible implementation.
- `src/services/supabaseProjectsRepository.ts`: Supabase read preparation and write stubs.
