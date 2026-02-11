import sharp from 'sharp';

const MAX_SIDE_PX = 1200;
const MAX_BYTES = 1.4 * 1024 * 1024; // 1.4 MB

export interface ResizeResult {
  buffer: Buffer;
  contentType: string;
}

/**
 * Resize image so that width and height are at most MAX_SIDE_PX (maintain aspect ratio),
 * and output size is at most MAX_BYTES. Prefer JPEG for smaller size.
 */
export async function resizeAvatarToLimit(input: Buffer, mimeType?: string): Promise<ResizeResult> {
  let image = sharp(input);
  const meta = await image.metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;

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

  const tryEncode = async (q: number): Promise<Buffer> => {
    const pipeline = sharp(input)
      .resize(width, height, { fit: 'inside', withoutEnlargement: true });
    if (isPng) {
      return pipeline.png({ compressionLevel: 9 }).toBuffer();
    }
    return pipeline.jpeg({ quality: q }).toBuffer();
  };

  buffer = await tryEncode(quality);
  while (buffer.length > MAX_BYTES && quality > 20) {
    quality -= 10;
    buffer = await tryEncode(quality);
  }

  return {
    buffer,
    contentType: isPng ? 'image/png' : 'image/jpeg',
  };
}

export function getMaxSizeBytes(): number {
  return MAX_BYTES;
}

export function getMaxSizeMB(): number {
  return 1.4;
}
