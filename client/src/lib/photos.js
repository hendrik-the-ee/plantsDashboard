export function plantPhotoUrl(filePath) {
  if (!filePath) return null;
  return `/uploads/${filePath}`;
}
