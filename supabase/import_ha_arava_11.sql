-- Safe, idempotent import for the project "הערבה 11, חולון".
-- Apply migrations first. This script imports project data and project materials only.
-- It never imports apartments, leads, meetings, tasks, customers, or client data.
-- It never updates an existing project row. A non-canonical duplicate aborts the import.

do $$
declare
  v_project_id uuid;
  v_candidate_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('goldlands:ha-arava-11-holon', 0));

  select count(*)
  into v_candidate_count
  from public.projects
  where lower(btrim(name)) in (lower('הערבה 11'), lower('הערבה 11 חולון'))
     or lower(btrim(address)) in (lower('הערבה 11'), lower('הערבה 11, חולון'), lower('הערבה 11 חולון'))
     or lower(btrim(coalesce(project_code, ''))) = lower('ARV');

  if v_candidate_count > 0 then
    select id
    into v_project_id
    from public.projects
    where slug = 'ha-arava-11-holon'
      and lower(btrim(name)) = lower('הערבה 11')
      and lower(btrim(address)) = lower('הערבה 11, חולון')
      and lower(btrim(coalesce(project_code, ''))) = lower('ARV');

    if v_project_id is null or v_candidate_count <> 1 then
      raise exception
        'Import aborted: a possible duplicate exists for הערבה 11 / הערבה 11 חולון / ARV. Review it before importing.';
    end if;

    raise notice 'Canonical project already exists; project fields were not overwritten.';
  else
    insert into public.projects (
      slug,
      project_code,
      name,
      location,
      city,
      neighborhood,
      address,
      google_maps_url,
      google_maps_embed_url,
      project_type,
      marketing_status,
      tagline,
      description,
      logo_mark,
      block,
      parcel,
      planning_status,
      construction_stage,
      developer_company,
      company_registration_number,
      financing_bank,
      project_marketer,
      ground_breaking_date,
      construction_completion_date,
      campaign_launch_date,
      website_url,
      registration_form_url,
      sold_units,
      remaining_units,
      key_facts,
      floors,
      units,
      occupancy,
      parking_summary,
      buildings,
      existing_apartments,
      new_apartments,
      storage_summary,
      apartment_mix,
      readiness_percentage,
      is_active
    ) values (
      'ha-arava-11-holon',
      'ARV',
      'הערבה 11',
      'הערבה 11, חולון',
      'חולון',
      '',
      'הערבה 11, חולון',
      'https://www.google.com/maps/search/?api=1&query=%D7%94%D7%A2%D7%A8%D7%91%D7%94+11+%D7%97%D7%95%D7%9C%D7%95%D7%9F',
      'https://www.google.com/maps?q=%D7%94%D7%A2%D7%A8%D7%91%D7%94+11+%D7%97%D7%95%D7%9C%D7%95%D7%9F&output=embed',
      'תמ״א 38/1',
      'בשיווק',
      '',
      '',
      'ARV',
      '7127',
      '134',
      'בבנייה',
      'בבנייה',
      'פנינת הערבה 11 בע״מ',
      '515560969',
      'אמפא קפיטל',
      'דניאל גולדשטיין',
      null,
      date '2027-04-01',
      null,
      'https://www.goldlands.co.il/ha-arava-11-holon/',
      'https://gmfgroups.sharepoint.com/:b:/s/data/Eb-mstpYAgRGsLt72XFClC8Bindy-YlxMeMerRpD2y1D1w?e=euumuU',
      7,
      5,
      array['גוש 7127', 'חלקה 134', '12 יחידות למלאי', '7 נמכרו', '5 נותרו']::text[],
      '',
      '12',
      '01.04.2027',
      '',
      '1',
      '16',
      '12',
      '',
      '{"threeRooms":"0","fourRooms":"0","fiveRooms":"0","gardenApartments":"0","penthouses":"0"}'::jsonb,
      0,
      true
    )
    returning id into v_project_id;
  end if;

  insert into public.project_documents (
    project_id,
    document_type,
    title,
    file_name,
    storage_bucket,
    storage_path,
    external_url,
    mime_type,
    size_bytes,
    version,
    status,
    association,
    target
  )
  select
    v_project_id,
    source.document_type,
    source.title,
    source.file_name,
    'project-documents',
    '',
    source.external_url,
    '',
    0,
    1,
    'active',
    source.association,
    source.target
  from (
    values
      (
        'price_list',
        'מחירון הערבה 11',
        'מחירון הערבה 11',
        'https://gmfgroups.sharepoint.com/:i:/s/data/IQDJ3ZUXVnhaSJbK45JbC_0OAboAlwCeHRWhU2NBgFgd_Vk?e=t22eyp',
        'מחירון',
        'מחירון הפרויקט'
      ),
      (
        'sales_deck',
        'מצגת הערבה 11',
        'מצגת הערבה 11',
        'https://www.canva.com/design/DAGdZGmTXYw/tx4ijUPdEckISCvmPWJwIA/view?utm_content=DAGdZGmTXYw&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h65a7ef5867',
        'מצגת',
        'מצגת הפרויקט'
      ),
      (
        'other',
        'טופס רישום הערבה 11',
        'טופס רישום הערבה 11',
        'https://gmfgroups.sharepoint.com/:b:/s/data/Eb-mstpYAgRGsLt72XFClC8Bindy-YlxMeMerRpD2y1D1w?e=euumuU',
        'אחר',
        'טופס רישום'
      )
  ) as source(document_type, title, file_name, external_url, association, target)
  where not exists (
    select 1
    from public.project_documents existing
    where existing.project_id = v_project_id
      and existing.external_url = source.external_url
  );
end
$$;
