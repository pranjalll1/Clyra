const ACCEPTED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_RAW_BYTES = 10 * 1024 * 1024;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read this image file.'));
    };
    img.src = url;
  });
}

function encodeCanvas(img, width, height, quality) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const webp = canvas.toDataURL('image/webp', quality);
  if (webp.startsWith('data:image/webp')) return webp;
  return canvas.toDataURL('image/jpeg', quality);
}

// Resizes and compresses an image in the browser to a compact Data URL so uploads
// persist in MongoDB and render reliably on Vercel without filesystem writes.
export async function compressImageFile(file, { maxDimension = 1200, maxLength = 380000 } = {}) {
  if (!file) throw new Error('No file selected.');
  if (!ACCEPTED_TYPES.has(file.type)) {
    throw new Error('Use a PNG, JPG, or WebP image.');
  }
  if (file.size > MAX_RAW_BYTES) {
    throw new Error('Choose an image smaller than 10 MB.');
  }

  const img = await loadImage(file);
  const longest = Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height) || 1;
  const baseScale = longest > maxDimension ? maxDimension / longest : 1;
  let width = (img.naturalWidth || img.width) * baseScale;
  let height = (img.naturalHeight || img.height) * baseScale;

  for (const quality of [0.84, 0.72, 0.6, 0.48]) {
    const out = encodeCanvas(img, width, height, quality);
    if (out.length <= maxLength) return out;
  }

  width *= 0.7;
  height *= 0.7;
  const smaller = encodeCanvas(img, width, height, 0.6);
  if (smaller.length <= maxLength) return smaller;

  throw new Error('This image is too detailed to save. Try a smaller or simpler image.');
}
