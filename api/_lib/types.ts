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
