import { readFile } from "node:fs/promises";
import path from "node:path";

const CONTENT_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

export async function legacyStaticResponse(relativePath: string) {
  const filePath = path.join(process.cwd(), "public", relativePath);
  const body = await readFile(filePath);
  const contentType =
    CONTENT_TYPES[path.extname(filePath).toLowerCase()] ??
    "application/octet-stream";

  return new Response(body, {
    headers: {
      "Content-Type": contentType,
    },
  });
}
