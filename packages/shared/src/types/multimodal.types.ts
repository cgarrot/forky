export type MediaType = 'image' | 'video' | 'document' | 'link' | 'audio';

export interface MediaMetadata {
  filename?: string;
  size?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  duration?: number;
}

export interface Media {
  id: string;
  type: MediaType;
  url: string;
  metadata?: MediaMetadata;
  projectId: string;
  createdAt: Date;
}

export interface MediaCreate {
  type: MediaType;
  url: string;
  metadata?: MediaMetadata;
  projectId: string;
}

export interface MediaMap {
  [mediaId: string]: Media;
}
