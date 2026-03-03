import sharp from 'sharp';

const MAX_SIDE_PX = 1200;
const MAX_BYTES = 1.4 * 1024 * 1024; // 1.4 MB

export class ImageTooLargeAfterResizeError extends Error {
  constructor() {
    super('Image could not be resized to fit the limit');
    this.name = 'ImageTooLargeAfterResizeError';
  }
}

export interface ResizeResult {
  buffer: Buffer;
  contentType: string;
}

/**
 * Resize image so that width and height are at most MAX_SIDE_PX (maintain aspect ratio),
 * and output size is at most MAX_BYTES. Prefer JPEG for smaller size.
 * @throws {ImageTooLargeAfterResizeError} when resize cannot bring the image within limits
 */
export async function resizeAvatarToLimit(input: Buffer, mimeType?: string): Promise<ResizeResult> {
  const image = sharp(input);
  const meta = await image.metadata();
  const rawW = meta.width ?? 0;
  const rawH = meta.height ?? 0;
  // Orientation 5–8 swap dimensions after rotate(); use rotated dimensions for resize
  const orientation = meta.orientation ?? 1;
  const [w, h] = orientation >= 5 ? [rawH, rawW] : [rawW, rawH];

  let width = w;
  let height = h;
  if (w > MAX_SIDE_PX || h > MAX_SIDE_PX) {
    if (w >= h) {
      width = MAX_SIDE_PX;
      height = Math.round((h * MAX_SIDE_PX) / w);
    } else {
      height = MAX_SIDE_PX;
      width = Math.round((w * MAX_SIDE_PX) / h);
    }
  }

  const isPng = mimeType?.includes('png') || meta.format === 'png';
  let quality = 85;
  let buffer: Buffer;

  const tryEncodePng = async (): Promise<Buffer> => {
    return sharp(input)
      .rotate()
      .resize(width, height, { fit: 'inside', withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toBuffer();
  };

  const tryEncodeJpeg = async (q: number): Promise<Buffer> => {
    return sharp(input)
      .rotate()
      .resize(width, height, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: q })
      .toBuffer();
  };

  let contentType: string;
  if (isPng) {
    buffer = await tryEncodePng();
    if (buffer.length > MAX_BYTES) {
      // Try converting to JPEG with quality reduction
      buffer = await tryEncodeJpeg(quality);
      while (buffer.length > MAX_BYTES && quality > 20) {
        quality -= 10;
        buffer = await tryEncodeJpeg(quality);
      }
      contentType = 'image/jpeg';
    } else {
      contentType = 'image/png';
    }
  } else {
    buffer = await tryEncodeJpeg(quality);
    while (buffer.length > MAX_BYTES && quality > 20) {
      quality -= 10;
      buffer = await tryEncodeJpeg(quality);
    }
    contentType = 'image/jpeg';
  }

  if (buffer.length > MAX_BYTES) {
    throw new ImageTooLargeAfterResizeError();
  }

  return { buffer, contentType };
}

export function getMaxSizeBytes(): number {
  return MAX_BYTES;
}

export function getMaxSizeMB(): number {
  return 1.4;
}
