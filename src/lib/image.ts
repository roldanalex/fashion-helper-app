import imageCompression from "browser-image-compression";

/**
 * Compress a wardrobe photo client-side before upload: max 1024px,
 * webp, ~300KB. One asset serves both the UI grid and the vision call.
 */
export async function compressWardrobePhoto(file: File): Promise<File> {
  return imageCompression(file, {
    maxWidthOrHeight: 1024,
    maxSizeMB: 0.3,
    fileType: "image/webp",
    useWebWorker: true,
    initialQuality: 0.85,
  });
}
