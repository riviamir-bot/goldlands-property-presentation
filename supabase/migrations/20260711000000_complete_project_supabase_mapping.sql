alter table public.projects
  add column if not exists block text,
  add column if not exists parcel text,
  add column if not exists licensing_route text,
  add column if not exists planning_status text,
  add column if not exists developer_units text,
  add column if not exists owner_units text,
  add column if not exists technical_spec_notes text[] not null default '{}';

alter table public.project_images
  add column if not exists association text,
  add column if not exists target text;

alter table public.project_documents
  add column if not exists association text,
  add column if not exists target text;
