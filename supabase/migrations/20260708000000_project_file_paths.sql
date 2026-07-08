alter table public.projects
  add column if not exists project_logo_path text,
  add column if not exists main_image_path text;
