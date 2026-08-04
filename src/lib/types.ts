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

export type SiteSettings = {
  id: string;
  email: string;
  is_admin: boolean;
  active: boolean;
  created_at: string;
};

export type SiteSettings = {
  id: number;
  site_name: string;
  updated_at: string;
};

export const PHOTO_ASPECT_RATIO = 3 / 4;
export const PHOTO_WIDTH = 1080;
export const PHOTO_HEIGHT = 1440;
