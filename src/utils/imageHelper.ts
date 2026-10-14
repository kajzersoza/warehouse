/**
 * Helper to normalize image URLs.
 * Handles Google Drive sharing links, Dropbox links, and standard direct image URLs.
 */
export function normalizeImageUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  const url = rawUrl.trim();

  // 1. Google Drive URLs
  // Patterns:
  // https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  // https://drive.google.com/open?id=FILE_ID
  // https://drive.google.com/uc?id=FILE_ID
  // https://drive.google.com/uc?export=view&id=FILE_ID
  if (url.includes('drive.google.com') || url.includes('drive.usercontent.google.com')) {
    const fileIdMatch =
      url.match(/\/file\/d\/([a-zA-Z0-9_\-]+)/) ||
      url.match(/[?&]id=([a-zA-Z0-9_\-]+)/);

    if (fileIdMatch && fileIdMatch[1]) {
      const fileId = fileIdMatch[1];
      // Google usercontent CDN direct image thumbnail/display endpoint:
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
  }

  // 2. Dropbox share links
  // Convert dl=0 to raw=1 for direct image streaming
  if (url.includes('dropbox.com')) {
    if (url.includes('dl=0')) {
      return url.replace('dl=0', 'raw=1');
    }
    if (!url.includes('raw=1')) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}raw=1`;
    }
  }

  // 3. OneDrive direct embed link or standard web image
  return url;
}
