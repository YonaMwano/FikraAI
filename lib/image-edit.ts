/** Convert browser uploads into named files supported by the image provider SDK. */
export function imageEditInput(value: string): string | File {
  if (value.startsWith("https://")) {
    new URL(value);
    return value;
  }
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) throw new Error("Unsupported image");
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > 10 * 1024 * 1024) throw new Error("Invalid image size");
  return new File([bytes], `source.${match[1]}`, { type: `image/${match[1]}` });
}
