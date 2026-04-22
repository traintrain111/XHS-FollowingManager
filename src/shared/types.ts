export interface Author {
  user_id: string;
  nickname: string;
  profile_url: string;
  tags: string[];
  followed?: boolean;
  favorite?: boolean;
  avatar_url?: string;
  note?: string;
  profile_summary?: string;
}

export interface Tag {
  id: string;
  name: string;
}

export interface ScrapeResult {
  success: boolean;
  message: string;
  total: number;
  added: number;
  merged: number;
}

export interface RuntimeMessageMap {
  SCAN_SEARCH_RESULTS: {
    type: 'SCAN_SEARCH_RESULTS';
  };
}
