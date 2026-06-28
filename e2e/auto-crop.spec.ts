import { deflateSync } from "node:zlib";

import { expect, test } from "@playwright/test";

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type: string, data: Buffer) {
  const typeBuffer = Buffer.from(type);
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);

  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);

  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

function createPngBuffer(
  width: number,
  height: number,
  color: [number, number, number, number],
) {
  const signature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rows = [];
  for (let row = 0; row < height; row += 1) {
    const scanline = Buffer.alloc(1 + width * 4);
    scanline[0] = 0;
    for (let column = 0; column < width; column += 1) {
      const offset = 1 + column * 4;
      scanline[offset] = color[0];
      scanline[offset + 1] = color[1];
      scanline[offset + 2] = color[2];
      scanline[offset + 3] = color[3];
    }
    rows.push(scanline);
  }

  const idat = deflateSync(Buffer.concat(rows));

  return Buffer.concat([
    signature,
    createChunk("IHDR", ihdr),
    createChunk("IDAT", idat),
    createChunk("IEND", Buffer.alloc(0)),
  ]);
}

const pngBuffer = createPngBuffer(24, 16, [196, 110, 44, 255]);

test("processes a single photo and offers a direct download", async ({
  page,
}) => {
  await page.goto("/tools/auto-crop");

  await page.locator('input[type="file"]').setInputFiles({
    name: "front-listing.png",
    mimeType: "image/png",
    buffer: pngBuffer,
  });

  await expect(
    page.getByRole("heading", { name: "front-listing.png" }),
  ).toBeVisible();
  await expect(page.getByTestId("preview-download")).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("preview-download").click(),
  ]);

  expect(await download.suggestedFilename()).toContain("cropped");
});

test("accepts a batch and exports a zip", async ({ page }) => {
  await page.goto("/tools/auto-crop");

  await page.locator('input[type="file"]').setInputFiles([
    {
      name: "first-shot.png",
      mimeType: "image/png",
      buffer: pngBuffer,
    },
    {
      name: "second-shot.png",
      mimeType: "image/png",
      buffer: pngBuffer,
    },
  ]);

  await expect(page.locator('[data-file-name="first-shot.png"]')).toBeVisible();
  await expect(page.locator('[data-file-name="second-shot.png"]')).toBeVisible();
  await expect(page.getByTestId("queue-total")).toHaveText("2 total");
  await expect(page.getByTestId("download-all")).toBeEnabled();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("download-all").click(),
  ]);

  expect(await download.suggestedFilename()).toBe("auto-crop-batch.zip");
});
