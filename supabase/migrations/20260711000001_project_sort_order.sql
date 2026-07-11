alter table public.projects
  add column if not exists sort_order integer;

create index if not exists projects_sort_order_name_idx
  on public.projects(sort_order, name);
