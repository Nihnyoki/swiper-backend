export interface StoredMedia {
  mediaType: 'video' | 'image' | 'audio' | 'pdf' | 'note';
  filename: string;
  path: string;
  size: number;
  mimetype: string;
}
