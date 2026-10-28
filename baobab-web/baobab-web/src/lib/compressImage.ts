/** Compress an image File to a JPEG data URL suitable for Person.photoUrl. */
export async function compressImageToDataUrl(
  file: File,
  opts: { maxSide?: number; quality?: number; maxBytes?: number } = {},
): Promise<string> {
  const maxSide = opts.maxSide ?? 720;
  const quality = opts.quality ?? 0.78;
  const maxBytes = opts.maxBytes ?? 450_000;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let q = quality;
  let dataUrl = canvas.toDataURL("image/jpeg", q);
  while (dataUrl.length > maxBytes && q > 0.4) {
    q -= 0.08;
    dataUrl = canvas.toDataURL("image/jpeg", q);
  }
  return dataUrl;
}
