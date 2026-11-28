export interface MarketingProjectRow {
  id: string;
  slug: string | null;
  name: string;
  address: string | null;
  city: string | null;
  status: string | null;
  units: number | null;
  new_units: number | null;
  existing_units: number | null;
  building_count: number | null;
  description: string | null;
  project_type: string | null;
  construction_stage: string | null;
  block: string | null;
  parcel: string | null;
  sort_order: number | null;
  deleted_at: string | null;
  developer_company: string | null;
  financing_bank: string | null;
  construction_start_date: string | null;
  construction_completion_date: string | null;
  project_website_url: string | null;
  additional_links: unknown;
  /** Topics hidden from the client view; missing before the column exists. */
  presentation_hidden_topics?: unknown;
  /** Topics shown although hidden by default; missing before the column exists. */
  presentation_shown_topics?: unknown;
  company_number?: string | null;
  price_list_url?: string | null;
  presentation_url?: string | null;
  registration_form_url?: string | null;
}

export interface MarketingApartmentRow {
  id: string;
  project_id: string;
  apartment_number: string | null;
  building: string | null;
  floor: number | null;
  rooms: number | null;
  area: number | null;
  balcony_area: number | null;
  price: number | null;
  status: string | null;
  deleted_at: string | null;
  plan_storage_path?: string | null;
  plan_filename?: string | null;
  plan_content_type?: string | null;
}

export interface MarketingRenderRow {
  id: string;
  project_id: string;
  filename: string;
  storage_bucket: string;
  storage_path: string;
  sort_order: number | null;
  is_featured: boolean;
  modified_at: string | null;
  /** Manual group of the rendering; null or missing means the automatic grouping applies. */
  group_id?: string | null;
}

export interface MarketingRenderGroupRow {
  id: string;
  project_id: string;
  name: string;
  is_building: boolean;
  sort_order: number;
}

export interface MarketingDocumentRow {
  id: string;
  project_id: string;
  document_type: string;
  filename: string;
  storage_bucket: string;
  storage_path: string;
  created_at: string;
}

export type SignedUrlLookup = (bucket: string, path: string) => string | undefined;

export interface ShareLinkRow {
  id: string;
  project_id: string;
  created_by: string | null;
  apartment_ids: string[];
  show_prices: boolean;
  language: string;
  expires_at: string;
  revoked_at: string | null;
  view_count: number;
  last_viewed_at: string | null;
}

export type UsageEventType = "project_opened" | "share_link_created" | "share_link_viewed";

/** Reviewed English/French texts of a project (public.presentation_project_translations). JSON columns are untrusted shape. */
export interface MarketingProjectTranslationRow {
  project_id: string;
  language: string;
  name: string | null;
  city: string | null;
  address: string | null;
  neighborhood: string | null;
  tagline: string | null;
  description: string | null;
  location_description: string | null;
  developer_about: string | null;
  spec_sections: unknown;
  feature_blocks: unknown;
}

/** Published Gold View content (public.presentation_project_content). JSON columns are untrusted shape. */
export interface MarketingProjectContentRow {
  project_id: string;
  status: string;
  tagline: string | null;
  description: string | null;
  neighborhood: string | null;
  location_description: string | null;
  developer_name: string | null;
  developer_about: string | null;
  developer_website: string | null;
  architect: string | null;
  facts: unknown;
  spec_sections: unknown;
  feature_blocks: unknown;
  legal_disclaimer: string | null;
}
