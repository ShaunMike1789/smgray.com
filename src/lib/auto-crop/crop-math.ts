import type { Bounds, CropOutputAspect } from "@/lib/auto-crop/types";

const ANALYSIS_MAX_DIMENSION = 720;
const DENSITY_RATIO = 0.1;
const MASS_TRIM_RATIO = 0.01;
const MAX_FULL_FRAME_COVERAGE = 0.94;
const MIN_COMPONENT_PIXELS = 64;

interface AnalysisField {
  alpha: Uint8Array;
  height: number;
  width: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function createBoundsFromEdges(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): Bounds {
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

function percentileAlpha(alpha: Uint8Array, percentile: number) {
  const histogram = new Uint32Array(256);
  let positivePixels = 0;

  for (const value of alpha) {
    if (value > 0) {
      histogram[value] += 1;
      positivePixels += 1;
    }
  }

  if (positivePixels === 0) {
    return 0;
  }

  const threshold = Math.ceil(positivePixels * percentile);
  let seen = 0;

  for (let value = 0; value < histogram.length; value += 1) {
    seen += histogram[value];
    if (seen >= threshold) {
      return value;
    }
  }

  return 255;
}

function buildAnalysisField(
  alpha: Uint8Array,
  width: number,
  height: number,
): AnalysisField {
  const maxDimension = Math.max(width, height);
  if (maxDimension <= ANALYSIS_MAX_DIMENSION) {
    return { alpha, width, height };
  }

  const scale = ANALYSIS_MAX_DIMENSION / maxDimension;
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));
  const sampled = new Uint8Array(targetWidth * targetHeight);

  for (let targetY = 0; targetY < targetHeight; targetY += 1) {
    const startY = Math.floor((targetY / targetHeight) * height);
    const endY = Math.max(
      startY + 1,
      Math.floor(((targetY + 1) / targetHeight) * height),
    );

    for (let targetX = 0; targetX < targetWidth; targetX += 1) {
      const startX = Math.floor((targetX / targetWidth) * width);
      const endX = Math.max(
        startX + 1,
        Math.floor(((targetX + 1) / targetWidth) * width),
      );

      let blockMax = 0;

      for (let sourceY = startY; sourceY < endY; sourceY += 1) {
        const rowOffset = sourceY * width;
        for (let sourceX = startX; sourceX < endX; sourceX += 1) {
          const value = alpha[rowOffset + sourceX];
          if (value > blockMax) {
            blockMax = value;
          }
        }
      }

      sampled[targetY * targetWidth + targetX] = blockMax;
    }
  }

  return { alpha: sampled, width: targetWidth, height: targetHeight };
}

function scaleBounds(
  bounds: Bounds,
  sourceWidth: number,
  sourceHeight: number,
  analyzedWidth: number,
  analyzedHeight: number,
): Bounds {
  const left = Math.floor((bounds.x / analyzedWidth) * sourceWidth);
  const top = Math.floor((bounds.y / analyzedHeight) * sourceHeight);
  const right = Math.ceil(
    ((bounds.x + bounds.width) / analyzedWidth) * sourceWidth,
  );
  const bottom = Math.ceil(
    ((bounds.y + bounds.height) / analyzedHeight) * sourceHeight,
  );

  return {
    x: clamp(left, 0, sourceWidth - 1),
    y: clamp(top, 0, sourceHeight - 1),
    width: clamp(right - left, 1, sourceWidth),
    height: clamp(bottom - top, 1, sourceHeight),
  };
}

function trimByMass(values: number[]) {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return null;
  }

  const cutoff = total * MASS_TRIM_RATIO;
  let start = 0;
  let startMass = 0;
  while (start < values.length && startMass + values[start] <= cutoff) {
    startMass += values[start];
    start += 1;
  }

  let end = values.length - 1;
  let endMass = 0;
  while (end >= start && endMass + values[end] <= cutoff) {
    endMass += values[end];
    end -= 1;
  }

  return end >= start ? { start, end } : null;
}

function trimByEnergy(values: number[]) {
  const maxValue = Math.max(...values);
  if (maxValue <= 0) {
    return null;
  }

  const threshold = maxValue * DENSITY_RATIO;
  const start = values.findIndex((value) => value >= threshold);
  const end = values.length - 1 - [...values].reverse().findIndex((value) => value >= threshold);

  return start === -1 || end < start ? null : { start, end };
}

function findDensityBounds(alpha: Uint8Array, width: number, height: number) {
  const rowSums = new Array<number>(height).fill(0);
  const colSums = new Array<number>(width).fill(0);

  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x += 1) {
      const value = alpha[rowOffset + x];
      rowSums[y] += value;
      colSums[x] += value;
    }
  }

  const massRows = trimByMass(rowSums);
  const massCols = trimByMass(colSums);

  if (!massRows || !massCols) {
    return null;
  }

  const energyRows = trimByEnergy(rowSums);
  const energyCols = trimByEnergy(colSums);

  const startY = Math.max(massRows.start, energyRows?.start ?? massRows.start);
  const endY = Math.min(massRows.end, energyRows?.end ?? massRows.end);
  const startX = Math.max(massCols.start, energyCols?.start ?? massCols.start);
  const endX = Math.min(massCols.end, energyCols?.end ?? massCols.end);

  if (endX < startX || endY < startY) {
    return createBoundsFromEdges(
      massCols.start,
      massRows.start,
      massCols.end,
      massRows.end,
    );
  }

  return createBoundsFromEdges(startX, startY, endX, endY);
}

function findDominantConnectedBounds(
  alpha: Uint8Array,
  width: number,
) {
  const adaptiveThreshold = clamp(
    Math.round(percentileAlpha(alpha, 0.78) * 0.82),
    36,
    224,
  );
  const visited = new Uint8Array(alpha.length);
  const queue = new Uint32Array(alpha.length);

  let bestArea = 0;
  let bestBounds: Bounds | null = null;

  for (let index = 0; index < alpha.length; index += 1) {
    if (visited[index] || alpha[index] < adaptiveThreshold) {
      visited[index] = 1;
      continue;
    }

    let area = 0;
    let head = 0;
    let tail = 0;
    queue[tail] = index;
    tail += 1;
    visited[index] = 1;

    let minX = index % width;
    let maxX = minX;
    let minY = Math.floor(index / width);
    let maxY = minY;

    while (head < tail) {
      const current = queue[head];
      head += 1;
      area += 1;

      const x = current % width;
      const y = Math.floor(current / width);

      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);

      const neighbors = [
        current - 1,
        current + 1,
        current - width,
        current + width,
      ];

      for (const neighbor of neighbors) {
        if (neighbor < 0 || neighbor >= alpha.length || visited[neighbor]) {
          continue;
        }

        const neighborX = neighbor % width;
        const neighborY = Math.floor(neighbor / width);
        if (Math.abs(neighborX - x) + Math.abs(neighborY - y) !== 1) {
          continue;
        }

        visited[neighbor] = 1;
        if (alpha[neighbor] >= adaptiveThreshold) {
          queue[tail] = neighbor;
          tail += 1;
        }
      }
    }

    if (area < MIN_COMPONENT_PIXELS || area <= bestArea) {
      continue;
    }

    bestArea = area;
    bestBounds = createBoundsFromEdges(minX, minY, maxX, maxY);
  }

  return bestBounds;
}

function isDegenerate(bounds: Bounds, imageWidth: number, imageHeight: number) {
  return (
    bounds.width / imageWidth >= MAX_FULL_FRAME_COVERAGE &&
    bounds.height / imageHeight >= MAX_FULL_FRAME_COVERAGE
  );
}

function clampBounds(bounds: Bounds, imageWidth: number, imageHeight: number) {
  const x = clamp(bounds.x, 0, imageWidth - 1);
  const y = clamp(bounds.y, 0, imageHeight - 1);
  const maxWidth = imageWidth - x;
  const maxHeight = imageHeight - y;

  return {
    x,
    y,
    width: clamp(bounds.width, 1, maxWidth),
    height: clamp(bounds.height, 1, maxHeight),
  };
}

export function extractAlphaChannel(data: Uint8ClampedArray, channels: number) {
  if (channels !== 4) {
    throw new Error(`Expected an RGBA image, but received ${channels} channels.`);
  }

  const alpha = new Uint8Array(data.length / 4);
  for (let index = 0; index < alpha.length; index += 1) {
    alpha[index] = data[index * 4 + 3];
  }
  return alpha;
}

export function findSubjectBoundsFromAlpha(
  alpha: Uint8Array,
  width: number,
  height: number,
) {
  const analysis = buildAnalysisField(alpha, width, height);
  const connected = findDominantConnectedBounds(
    analysis.alpha,
    analysis.width,
  );
  const density = findDensityBounds(analysis.alpha, analysis.width, analysis.height);

  let chosen = connected ?? density;
  if (!chosen) {
    chosen = { x: 0, y: 0, width: analysis.width, height: analysis.height };
  }

  if (density && connected && isDegenerate(connected, analysis.width, analysis.height)) {
    chosen = density;
  }

  return clampBounds(
    scaleBounds(chosen, width, height, analysis.width, analysis.height),
    width,
    height,
  );
}

export function expandBoundsWithPadding(
  bounds: Bounds,
  imageWidth: number,
  imageHeight: number,
  paddingPercent: number,
) {
  const padding = clamp(paddingPercent, 0, 40) / 100;
  const padX = Math.round(bounds.width * (padding / 2));
  const padY = Math.round(bounds.height * (padding / 2));

  return clampBounds(
    {
      x: bounds.x - padX,
      y: bounds.y - padY,
      width: bounds.width + padX * 2,
      height: bounds.height + padY * 2,
    },
    imageWidth,
    imageHeight,
  );
}

export function fitBoundsToAspectRatio(
  bounds: Bounds,
  imageWidth: number,
  imageHeight: number,
  targetAspectRatio: number,
) {
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;

  let desiredWidth = bounds.width;
  let desiredHeight = bounds.height;
  const currentAspectRatio = bounds.width / bounds.height;

  if (currentAspectRatio < targetAspectRatio) {
    desiredWidth = bounds.height * targetAspectRatio;
  } else {
    desiredHeight = bounds.width / targetAspectRatio;
  }

  desiredWidth = Math.min(desiredWidth, imageWidth);
  desiredHeight = Math.min(desiredHeight, imageHeight);

  let left = centerX - desiredWidth / 2;
  let top = centerY - desiredHeight / 2;
  let right = centerX + desiredWidth / 2;
  let bottom = centerY + desiredHeight / 2;

  if (left < 0) {
    right -= left;
    left = 0;
  }
  if (top < 0) {
    bottom -= top;
    top = 0;
  }
  if (right > imageWidth) {
    left -= right - imageWidth;
    right = imageWidth;
  }
  if (bottom > imageHeight) {
    top -= bottom - imageHeight;
    bottom = imageHeight;
  }

  return clampBounds(
    {
      x: Math.floor(left),
      y: Math.floor(top),
      width: Math.ceil(right - left),
      height: Math.ceil(bottom - top),
    },
    imageWidth,
    imageHeight,
  );
}

export function computeCropBounds(
  alpha: Uint8Array,
  imageWidth: number,
  imageHeight: number,
  paddingPercent: number,
  outputAspect: CropOutputAspect,
) {
  const subjectBounds = findSubjectBoundsFromAlpha(alpha, imageWidth, imageHeight);
  const paddedSubjectBounds = expandBoundsWithPadding(
    subjectBounds,
    imageWidth,
    imageHeight,
    paddingPercent,
  );
  const cropBounds =
    outputAspect === "original"
      ? fitBoundsToAspectRatio(
          paddedSubjectBounds,
          imageWidth,
          imageHeight,
          imageWidth / imageHeight,
        )
      : paddedSubjectBounds;

  return { cropBounds, subjectBounds };
}
