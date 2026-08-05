export type Event = {
  id: string;
  slug: string;
  name: string;
  description: string;
  cover_url: string;
  active: boolean;
  theme_color: string;
  icon: string;
  user_id: string | null;
  created_at: string;
};

export type Frame = {
  id: string;
  event_id: string;
  name: string;
  image_url: string;
  sort_order: number;
  created_at: string;
};

export type Photo = {
  id: string;
  event_id: string;
  frame_id: string | null;
  storage_path: string;
  public_url: string;
  author_name: string | null;
  approved: boolean;
  archived: boolean;
  created_at: string;
  uploaded_by_profile_id?: string | null;
  analysis_status?: string;
  analysis_version?: number | null;
  analyzed_at?: string | null;
  needs_reanalysis?: boolean;
};

export type Profile = {
  id: string;
  email: string;
  is_admin: boolean;
  active: boolean;
  created_at: string;
};

export type ParticipantProfile = {
  id: string;
  event_id: string;
  name: string;
  reference_photo_url: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type EventPerson = {
  id: string;
  name: string;
  reference_photo_url: string;
  photo_count: number;
  last_photo_at: string | null;
};

export type DeviceIdentity = {
  id: string;
  event_id: string;
  device_token_hash: string;
  participant_profile_id: string | null;
  last_seen_at: string;
  created_at: string;
};

export type DetectedFace = {
  id: string;
  photo_id: string;
  event_id: string;
  face_index: number;
  embedding: number[];
  confidence: number;
  source: string;
  cluster_id: string | null;
  manually_rejected: boolean;
  created_at: string;
};

export type FaceCluster = {
  id: string;
  event_id: string;
  label: string | null;
  participant_profile_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type UnidentifiedCluster = {
  cluster_id: string;
  face_count: number;
  sample_photo_url: string | null;
  sample_face_id: string | null;
  created_at: string;
};

export type PersonEventEntry = {
  profile_id: string;
  event_id: string;
  event_name: string;
  event_slug: string;
  photo_count: number;
  created_at: string;
};

export type GlobalPerson = {
  person_key: string;
  display_name: string;
  reference_photo_url: string;
  event_count: number;
  total_photo_count: number;
  events: PersonEventEntry[];
};

export type SiteSettings = {
  id: number;
  site_name: string;
  updated_at: string;
};

export const PHOTO_ASPECT_RATIO = 3 / 4;
export const PHOTO_WIDTH = 1080;
export const PHOTO_HEIGHT = 1440;
