create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'sales' check (role in ('admin', 'sales', 'viewer')),
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  location text,
  city text not null,
  neighborhood text not null default '',
  address text not null default '',
  google_maps_url text,
  google_maps_embed_url text,
  project_type text not null default 'פרויקט חדש'
    check (project_type in ('פרויקט חדש', 'תמ״א 38/1', 'תמ״א 38/2 / פינוי בינוי')),
  marketing_status text not null default 'טיוטה',
  tagline text not null default '',
  description text not null default '',
  logo_mark text not null default '',
  key_facts text[] not null default '{}',
  floors text not null default '',
  units text not null default '',
  occupancy text not null default '',
  parking_summary text not null default '',
  buildings text not null default '',
  existing_apartments text not null default '',
  new_apartments text not null default '',
  storage_summary text not null default '',
  apartment_mix jsonb not null default '{}'::jsonb,
  readiness_percentage integer not null default 0 check (readiness_percentage between 0 and 100),
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.apartments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  number text not null,
  floor numeric not null default 0,
  rooms numeric not null default 0,
  apartment_area numeric not null default 0,
  balcony_area numeric not null default 0,
  garden_area numeric not null default 0,
  parking text not null default '',
  storage text not null default '',
  direction text not null default '',
  price numeric not null default 0,
  special_price numeric not null default 0,
  status text not null default 'available'
    check (status in ('available', 'option', 'reserved', 'sold', 'notMarketing')),
  plan_file_status text not null default 'missing'
    check (plan_file_status in ('missing', 'attached', 'pending')),
  notes text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, number)
);

create table public.project_materials (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  material_type text not null
    check (
      material_type in (
        'details',
        'logo',
        'main_image',
        'exterior',
        'interior',
        'inventory',
        'plans',
        'floor_plans',
        'prices',
        'technical',
        'location',
        'faq',
        'summary',
        'brochure',
        'documents'
      )
    ),
  status text not null default 'missing' check (status in ('missing', 'partial', 'complete')),
  title text not null default '',
  summary text not null default '',
  manual_data jsonb not null default '{}'::jsonb,
  missing_items jsonb not null default '{"critical":[],"important":[],"optional":[]}'::jsonb,
  last_updated_at timestamptz,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, material_type)
);

create table public.project_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  category text not null
    check (category in ('logo', 'main', 'exterior', 'interior', 'lobby', 'surroundings', 'other')),
  storage_bucket text not null default 'project-media',
  storage_path text not null,
  alt_text text not null default '',
  caption text not null default '',
  is_primary boolean not null default false,
  display_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  apartment_id uuid references public.apartments(id) on delete cascade,
  document_type text not null
    check (
      document_type in (
        'apartment_plan',
        'floor_plan',
        'price_list',
        'brochure',
        'technical_spec',
        'sales_deck',
        'other'
      )
    ),
  title text not null default '',
  file_name text not null default '',
  storage_bucket text not null default 'project-documents',
  storage_path text not null,
  mime_type text not null default '',
  size_bytes bigint not null default 0,
  version integer not null default 1,
  status text not null default 'active' check (status in ('draft', 'active', 'archived')),
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.technical_specifications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  section_key text not null,
  title text not null,
  icon_key text not null default '',
  items jsonb not null default '[]'::jsonb,
  display_order integer not null default 0,
  default_open boolean not null default false,
  visible_to_client boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, section_key)
);

create table public.client_share_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  token_hash text not null unique,
  sections jsonb not null default '{}'::jsonb,
  show_price boolean not null default true,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  view_count integer not null default 0,
  last_viewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.client_share_link_apartments (
  share_link_id uuid not null references public.client_share_links(id) on delete cascade,
  apartment_id uuid not null references public.apartments(id) on delete cascade,
  include_plan boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (share_link_id, apartment_id)
);

create index projects_is_active_idx on public.projects(is_active);
create index apartments_project_id_idx on public.apartments(project_id);
create index apartments_status_idx on public.apartments(status);
create index project_materials_project_id_idx on public.project_materials(project_id);
create index project_images_project_id_category_idx on public.project_images(project_id, category);
create index project_documents_project_id_type_idx on public.project_documents(project_id, document_type);
create index technical_specifications_project_id_idx on public.technical_specifications(project_id);
create index client_share_links_project_id_idx on public.client_share_links(project_id);
create index client_share_links_expires_at_idx on public.client_share_links(expires_at);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create trigger apartments_set_updated_at
before update on public.apartments
for each row execute function public.set_updated_at();

create trigger project_materials_set_updated_at
before update on public.project_materials
for each row execute function public.set_updated_at();

create trigger project_images_set_updated_at
before update on public.project_images
for each row execute function public.set_updated_at();

create trigger project_documents_set_updated_at
before update on public.project_documents
for each row execute function public.set_updated_at();

create trigger technical_specifications_set_updated_at
before update on public.technical_specifications
for each row execute function public.set_updated_at();

create trigger client_share_links_set_updated_at
before update on public.client_share_links
for each row execute function public.set_updated_at();
