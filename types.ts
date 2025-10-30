export interface Track {
  id: number;
  title: string;
  artist: string;
  duration: string;
  url?: string; // For local file object URLs
}

export interface Album {
  id: number;
  title: string;
  artist: string;
  coverUrl: string;
  tracks: Track[];
}

export interface User {
  name: string;
  avatarUrl: string;
}