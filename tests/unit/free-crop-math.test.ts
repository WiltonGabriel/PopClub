import { describe, it, expect } from "vitest";
import {
  FULL_IMAGE_RECT,
  MIN_CROP_FRACTION,
  clampCropRect,
  clampPanOffset,
  computePixelCropFromFreeRect,
  resizeFreeCropRect,
} from "@/lib/freeCropMath";

describe("freeCropMath (Recorte Livre sem Presets Forçados)", () => {
  it("inicia com o enquadramento completo da imagem original (100%)", () => {
    expect(FULL_IMAGE_RECT).toEqual({
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    });

    const fullPixels = computePixelCropFromFreeRect(FULL_IMAGE_RECT, 1200, 800, 1, 0, 0);
    expect(fullPixels).toEqual({
      x: 0,
      y: 0,
      width: 1200,
      height: 800,
    });
  });

  it("clampCropRect mantém o retângulo dentro de [0..1] respeitando tamanho mínimo", () => {
    const clampedTooSmall = clampCropRect({ x: 0.98, y: 0.98, width: 0.01, height: 0.01 });
    expect(clampedTooSmall.width).toBeCloseTo(MIN_CROP_FRACTION, 5);
    expect(clampedTooSmall.height).toBeCloseTo(MIN_CROP_FRACTION, 5);
    expect(clampedTooSmall.x + clampedTooSmall.width).toBeLessThanOrEqual(1);
    expect(clampedTooSmall.y + clampedTooSmall.height).toBeLessThanOrEqual(1);

    const clampedNegative = clampCropRect({ x: -0.2, y: -0.1, width: 0.5, height: 0.4 });
    expect(clampedNegative).toEqual({ x: 0, y: 0, width: 0.5, height: 0.4 });
  });

  it("resizeFreeCropRect move e redimensiona todas as 8 alças sem travar proporção", () => {
    const base = { x: 0.2, y: 0.2, width: 0.5, height: 0.4 };

    // Move
    const moved = resizeFreeCropRect(base, "move", 0.1, 0.2);
    expect(moved.x).toBeCloseTo(0.3, 5);
    expect(moved.y).toBeCloseTo(0.4, 5);
    expect(moved.width).toBeCloseTo(0.5, 5);
    expect(moved.height).toBeCloseTo(0.4, 5);

    // Bordas livres (eixo único independente -> altera proporção livremente)
    const nRes = resizeFreeCropRect(base, "n", 0, -0.1);
    expect(nRes.y).toBeCloseTo(0.1, 5);
    expect(nRes.height).toBeCloseTo(0.5, 5);
    expect(nRes.width).toBeCloseTo(0.5, 5);

    const sRes = resizeFreeCropRect(base, "s", 0, 0.2);
    expect(sRes.height).toBeCloseTo(0.6, 5);
    expect(sRes.width).toBeCloseTo(0.5, 5);

    const wRes = resizeFreeCropRect(base, "w", 0.1, 0);
    expect(wRes.x).toBeCloseTo(0.3, 5);
    expect(wRes.width).toBeCloseTo(0.4, 5);
    expect(wRes.height).toBeCloseTo(0.4, 5);

    const eRes = resizeFreeCropRect(base, "e", 0.15, 0);
    expect(eRes.width).toBeCloseTo(0.65, 5);
    expect(eRes.height).toBeCloseTo(0.4, 5);

    // Cantos livres
    const nwRes = resizeFreeCropRect(base, "nw", -0.1, -0.05);
    expect(nwRes.x).toBeCloseTo(0.1, 5);
    expect(nwRes.y).toBeCloseTo(0.15, 5);
    expect(nwRes.width).toBeCloseTo(0.6, 5);
    expect(nwRes.height).toBeCloseTo(0.45, 5);

    const neRes = resizeFreeCropRect(base, "ne", 0.1, 0.1);
    expect(neRes.width).toBeCloseTo(0.6, 5);
    expect(neRes.y).toBeCloseTo(0.3, 5);

    const swRes = resizeFreeCropRect(base, "sw", 0.05, 0.1);
    expect(swRes.x).toBeCloseTo(0.25, 5);
    expect(swRes.height).toBeCloseTo(0.5, 5);

    const seRes = resizeFreeCropRect(base, "se", -0.2, -0.1);
    expect(seRes.width).toBeCloseTo(0.3, 5);
    expect(seRes.height).toBeCloseTo(0.3, 5);

    // Respeita tamanho mínimo se tentar inverter bordas
    const minClamped = resizeFreeCropRect(base, "w", 0.9, 0);
    expect(minClamped.width).toBeCloseTo(MIN_CROP_FRACTION, 5);
  });

  it("clampPanOffset trava pan em 0 quando zoom = 1 e libera conforme zoom aumenta", () => {
    expect(clampPanOffset(0.5, -0.5, 1)).toEqual({ x: 0, y: 0 });
    expect(clampPanOffset(0.9, -0.9, 2)).toEqual({ x: 0.5, y: -0.5 });
  });

  it("computePixelCropFromFreeRect converte recorte parcial e recorte com zoom + pan", () => {
    const partial = computePixelCropFromFreeRect(
      { x: 0.25, y: 0.1, width: 0.5, height: 0.5 },
      1000,
      800,
      1,
      0,
      0
    );
    expect(partial).toEqual({
      x: 250,
      y: 80,
      width: 500,
      height: 400,
    });

    // Com zoom = 2 e pan = (0,0), toda a viewport [0..1] mapeia para o miolo [0.25..0.75]
    const zoomedCenter = computePixelCropFromFreeRect(FULL_IMAGE_RECT, 1000, 1000, 2, 0, 0);
    expect(zoomedCenter).toEqual({
      x: 250,
      y: 250,
      width: 500,
      height: 500,
    });
  });
});
