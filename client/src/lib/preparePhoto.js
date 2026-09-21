/** Longest side after resize (px). */
const MAX_EDGE = 1920;
/** JPEG quality 0–1. */
const JPEG_QUALITY = 0.82;
/** Skip work when already small enough (bytes and pixels). */
const SKIP_UNDER_BYTES = 2 * 1024 * 1024;

/**
 * Resize/compress an image in the browser for upload.
 * Returns the original file when already under size/dimension limits.
 */
export async function preparePhotoForUpload(file) {
  if (!file?.type?.startsWith('image/')) return file;
  if (file.size <= SKIP_UNDER_BYTES) {
    const dims = await readImageSize(file).catch(() => null);
    if (dims && Math.max(dims.width, dims.height) <= MAX_EDGE) {
      return file;
    }
  }

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not prepare image for upload');
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await canvasToJpegBlob(canvas, JPEG_QUALITY);
    if (blob.size >= file.size && scale === 1) {
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo';
    return new File([blob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close();
  }
}

function canvasToJpegBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('Could not compress image'));
        else resolve(blob);
      },
      'image/jpeg',
      quality,
    );
  });
}

function readImageSize(file) {
  return createImageBitmap(file).then((bitmap) => {
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  });
}
