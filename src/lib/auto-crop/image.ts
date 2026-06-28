"use client";

import type { Bounds } from "@/lib/auto-crop/types";

function getOutputMimeType(file: File) {
  return file.type === "image/png" ? "image/png" : "image/jpeg";
}

async function loadImage(file: Blob) {
  if ("createImageBitmap" in window) {
    const bitmap = await createImageBitmap(file);
    return {
      element: bitmap,
      height: bitmap.height,
      width: bitmap.width,
      dispose: () => bitmap.close(),
    };
  }

  const url = URL.createObjectURL(file);

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const nextImage = new Image();
    nextImage.onload = () => resolve(nextImage);
    nextImage.onerror = () => reject(new Error("Unable to decode image."));
    nextImage.src = url;
  });

  return {
    element: image,
    height: image.naturalHeight,
    width: image.naturalWidth,
    dispose: () => URL.revokeObjectURL(url),
  };
}

export async function cropFileToBlob(file: File, bounds: Bounds) {
  const source = await loadImage(file);

  try {
    const canvas = document.createElement("canvas");
    canvas.width = bounds.width;
    canvas.height = bounds.height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Unable to create a 2D canvas context.");
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(
      source.element,
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height,
      0,
      0,
      bounds.width,
      bounds.height,
    );

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (nextBlob) => {
          if (!nextBlob) {
            reject(new Error("Unable to encode cropped image."));
            return;
          }
          resolve(nextBlob);
        },
        getOutputMimeType(file),
        0.92,
      );
    });

    return blob;
  } finally {
    source.dispose();
  }
}

export function createOutputFilename(file: File) {
  const parts = file.name.split(".");
  const extension = parts.length > 1 ? parts.pop() : "jpg";
  const basename = parts.join(".") || "photo";
  return `${basename}-cropped.${extension}`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function formatFileSize(sizeInBytes: number) {
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`;
  }

  const sizeInKilobytes = sizeInBytes / 1024;
  if (sizeInKilobytes < 1024) {
    return `${sizeInKilobytes.toFixed(1)} KB`;
  }

  return `${(sizeInKilobytes / 1024).toFixed(1)} MB`;
}
