import crypto from "node:crypto";
import { copyFileSync, unlinkSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { uploadDir } from "@/lib/paths";

const MAX_BYTES = 8 * 1024 * 1024;
const MAX_EDGE = 2000;
const MAX_PIXELS = 24_000_000;
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

type Ext = "jpg" | "png" | "gif" | "webp";

const CONTENT_TYPES: Record<Ext, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

function sniff(buf: Buffer): Ext | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(PNG)) return "png";
  const head = buf.length >= 6 ? buf.subarray(0, 6).toString("ascii") : "";
  if (head === "GIF87a" || head === "GIF89a") return "gif";
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

export function resolveUpload(id: string): string | null {
  if (!/^[a-f0-9]{32}\.(jpg|png|gif|webp)$/.test(id)) return null;
  const full = path.resolve(uploadDir, id);
  if (!full.startsWith(`${path.resolve(uploadDir)}${path.sep}`)) return null;
  return full;
}

export function contentTypeFor(id: string): string {
  const ext = id.split(".").pop() as Ext;
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}

async function reencode(bytes: Buffer): Promise<Buffer | null> {
  try {
    const image = sharp(bytes, { failOn: "error", limitInputPixels: MAX_PIXELS, animated: false })
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true });
    const meta = await image.metadata();
    if (!meta.width || !meta.height || meta.width < 8 || meta.height < 8) return null;
    const output = await image.jpeg({ quality: 84 }).toBuffer();
    return sniff(output) === "jpg" ? output : null;
  } catch {
    return null;
  }
}

export async function savePhoto(file: File): Promise<{ filename: string } | { error: string }> {
  if (!file || file.size <= 0) return { error: "Choose a photo of the apparel." };
  if (file.size > MAX_BYTES) return { error: "Use a photo under 8 MB." };
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!sniff(bytes)) return { error: "Use a JPEG, PNG, WebP, or GIF." };
  const image = await reencode(bytes);
  if (!image) return { error: "That file isn't a usable photo. Try another JPEG, PNG, WebP, or GIF." };
  const filename = `${crypto.randomBytes(16).toString("hex")}.jpg`;
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, filename), image);
  return { filename };
}

export async function deleteUpload(filename: string): Promise<void> {
  const full = resolveUpload(filename);
  if (!full) return;
  await fs.unlink(full).catch(() => undefined);
}

export function duplicateUpload(filename: string): string | null {
  const source = resolveUpload(filename);
  if (!source) return null;
  const ext = filename.slice(filename.lastIndexOf("."));
  if (!/^\.(jpg|png|gif|webp)$/.test(ext)) return null;
  const next = `${crypto.randomBytes(16).toString("hex")}${ext}`;
  copyFileSync(source, path.join(uploadDir, next));
  return next;
}

export function removeStoredUpload(filename: string): void {
  const full = resolveUpload(filename);
  if (!full) return;
  try {
    unlinkSync(full);
  } catch {
    /* already gone */
  }
}
