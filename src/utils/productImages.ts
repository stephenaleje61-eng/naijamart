/**
 * Product image utilities for ZangaMarket.
 * Ensures consistent, reliable image URL extraction, validation, and fallback handling
 * across all product cards, detail views, and seller/admin dashboards.
 */

/**
 * Checks if a candidate image URL is valid and usable.
 * Rejects broken dummy strings, ephemeral blob URLs, and invalid data URLs.
 */
export function isValidImageUrl(url: unknown): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.length < 5) return false;

  // Reject dummy placeholder markers
  if (trimmed.includes('persistent_image_proof')) return false;

  // Reject old hardcoded smartwatch placeholder that caused misleading product images
  if (trimmed.includes('photo-1523275335684-37898b6baf30')) return false;

  // Reject ephemeral blob URLs that expire after session/page reload
  if (trimmed.startsWith('blob:')) return false;

  // Validate Data URLs (must be image mime type and have sufficient base64 payload)
  if (trimmed.startsWith('data:')) {
    if (!trimmed.startsWith('data:image/')) return false;
    // Must contain base64 and actual content (> 150 characters)
    return trimmed.includes(';base64,') && trimmed.length > 150;
  }

  // HTTP or HTTPS URLs (e.g. Firebase Cloud Storage or CDN)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return true;
  }

  // Relative paths (e.g. /uploads/...)
  if (trimmed.startsWith('/')) {
    return true;
  }

  return false;
}

/**
 * Extracts all valid image URLs from a product's images array.
 * Places durable persistent Data URLs and Firebase Cloud Storage / HTTPS URLs first.
 */
export function getValidProductImages(
  images: (string | null | undefined)[] | undefined | null,
  primaryImageUrl?: string | null
): string[] {
  const list: string[] = [];

  if (primaryImageUrl && isValidImageUrl(primaryImageUrl)) {
    list.push(primaryImageUrl.trim());
  }

  if (images && Array.isArray(images)) {
    for (const img of images) {
      if (isValidImageUrl(img)) {
        const trimmed = (img as string).trim();
        if (!list.includes(trimmed)) {
          list.push(trimmed);
        }
      }
    }
  }

  if (list.length === 0) {
    return [];
  }

  // Sort images so that permanent HTTPS/Firebase URLs and persistent Data URLs take priority
  return list.sort((a, b) => {
    const score = (url: string) => {
      if (url.startsWith('https://firebasestorage.googleapis.com')) return 100;
      if (url.startsWith('https://')) return 90;
      if (url.startsWith('data:image/')) return 80;
      if (url.startsWith('http://')) return 70;
      if (url.startsWith('/uploads/')) return 10;
      return 0;
    };
    return score(b) - score(a);
  });
}

/**
 * Returns the primary display image URL for a product, or null if no valid image exists.
 */
export function getProductDisplayImage(
  images: (string | null | undefined)[] | undefined | null,
  primaryImageUrl?: string | null
): string | null {
  const validList = getValidProductImages(images, primaryImageUrl);
  return validList.length > 0 ? validList[0] : null;
}

