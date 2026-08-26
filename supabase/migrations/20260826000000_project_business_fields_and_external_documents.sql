alter table public.projects
  add column if not exists project_code text,
  add column if not exists construction_stage text,
  add column if not exists developer_company text,
  add column if not exists company_registration_number text,
  add column if not exists financing_bank text,
  add column if not exists project_marketer text,
  add column if not exists ground_breaking_date date,
  add column if not exists construction_completion_date date,
  add column if not exists campaign_launch_date date,
  add column if not exists website_url text,
  add column if not exists registration_form_url text,
  add column if not exists sold_units integer check (sold_units is null or sold_units >= 0),
  add column if not exists remaining_units integer check (remaining_units is null or remaining_units >= 0);

create unique index if not exists projects_project_code_unique
  on public.projects (lower(btrim(project_code)))
  where project_code is not null and btrim(project_code) <> '';

alter table public.project_documents
  add column if not exists external_url text;

create unique index if not exists project_documents_project_external_url_unique
  on public.project_documents (project_id, external_url)
  where external_url is not null and btrim(external_url) <> '';
