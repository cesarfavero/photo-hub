export type Event = {
  id: string;
  slug: string;
  name: string;
  description: string;
  cover_url: string;
  active: boolean;
  theme_color: string;
  icon: string;
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

export const PHOTO_ASPECT_RATIO = 3 / 4;
export const PHOTO_WIDTH = 1080;
export const PHOTO_HEIGHT = 1440;
