export interface NormalizedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type CropHandle =
  | "move"
  | "n"
  | "s"
  | "e"
  | "w"
  | "nw"
  | "ne"
  | "sw"
  | "se";

export interface PixelArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const FULL_IMAGE_RECT: NormalizedRect = {
  x: 0,
  y: 0,
  width: 1,
  height: 1,
};

export const MIN_CROP_FRACTION = 0.08;

export function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/**
 * Garante que o retângulo de recorte permaneça dentro de [0..1] com tamanho mínimo válido.
 */
export function clampCropRect(
  rect: NormalizedRect,
  minSize: number = MIN_CROP_FRACTION
): NormalizedRect {
  const safeMin = clampNumber(minSize, 0.02, 0.5);
  const width = clampNumber(rect.width, safeMin, 1);
  const height = clampNumber(rect.height, safeMin, 1);
  const x = clampNumber(rect.x, 0, 1 - width);
  const y = clampNumber(rect.y, 0, 1 - height);
  return { x, y, width, height };
}

/**
 * Redimensiona ou move livremente a área de recorte sem travar proporção,
 * preservando tamanho mínimo e limites do quadro [0..1].
 */
export function resizeFreeCropRect(
  startRect: NormalizedRect,
  handle: CropHandle,
  deltaX: number,
  deltaY: number,
  minSize: number = MIN_CROP_FRACTION
): NormalizedRect {
  const safeMin = clampNumber(minSize, 0.02, 0.5);

  if (handle === "move") {
    return clampCropRect(
      {
        x: startRect.x + deltaX,
        y: startRect.y + deltaY,
        width: startRect.width,
        height: startRect.height,
      },
      safeMin
    );
  }

  let left = startRect.x;
  let top = startRect.y;
  let right = startRect.x + startRect.width;
  let bottom = startRect.y + startRect.height;

  if (handle.includes("w")) {
    left = clampNumber(startRect.x + deltaX, 0, right - safeMin);
  }
  if (handle.includes("e")) {
    right = clampNumber(startRect.x + startRect.width + deltaX, left + safeMin, 1);
  }
  if (handle.includes("n")) {
    top = clampNumber(startRect.y + deltaY, 0, bottom - safeMin);
  }
  if (handle.includes("s")) {
    bottom = clampNumber(startRect.y + startRect.height + deltaY, top + safeMin, 1);
  }

  return clampCropRect(
    {
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
    },
    safeMin
  );
}

/**
 * Limita o deslocamento (pan) para impedir faixas vazias quando a imagem está ampliada.
 */
export function clampPanOffset(
  panX: number,
  panY: number,
  zoom: number
): { x: number; y: number } {
  const safeZoom = Math.max(1, zoom);
  const maxPan = Math.max(0, (safeZoom - 1) / 2);
  return {
    x: clampNumber(panX, -maxPan, maxPan) || 0,
    y: clampNumber(panY, -maxPan, maxPan) || 0,
  };
}

/**
 * Converte a seleção livre em viewport + zoom + pan para coordenadas exatas em pixels na imagem.
 * Quando rect = FULL_IMAGE_RECT, zoom = 1 e pan = (0, 0), retorna toda a imagem original sem cortes.
 */
export function computePixelCropFromFreeRect(
  rect: NormalizedRect,
  imageWidth: number,
  imageHeight: number,
  zoom: number = 1,
  panX: number = 0,
  panY: number = 0
): PixelArea {
  const safeWidth = Math.max(1, Math.round(imageWidth));
  const safeHeight = Math.max(1, Math.round(imageHeight));
  const safeZoom = Math.max(1, zoom);
  const clampedRect = clampCropRect(rect, 0.01);
  const clampedPan = clampPanOffset(panX, panY, safeZoom);

  const toImageCoord = (viewportCoord: number, pan: number) =>
    clampNumber(0.5 + (viewportCoord - 0.5 - pan) / safeZoom, 0, 1);

  const imgLeft = toImageCoord(clampedRect.x, clampedPan.x);
  const imgTop = toImageCoord(clampedRect.y, clampedPan.y);
  const imgRight = toImageCoord(clampedRect.x + clampedRect.width, clampedPan.x);
  const imgBottom = toImageCoord(clampedRect.y + clampedRect.height, clampedPan.y);

  const pxX = clampNumber(Math.round(imgLeft * safeWidth), 0, safeWidth - 1);
  const pxY = clampNumber(Math.round(imgTop * safeHeight), 0, safeHeight - 1);
  const pxRight = clampNumber(Math.round(imgRight * safeWidth), pxX + 1, safeWidth);
  const pxBottom = clampNumber(Math.round(imgBottom * safeHeight), pxY + 1, safeHeight);

  return {
    x: pxX,
    y: pxY,
    width: Math.max(1, pxRight - pxX),
    height: Math.max(1, pxBottom - pxY),
  };
}
