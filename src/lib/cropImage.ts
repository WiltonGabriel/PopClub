export interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropImageOptions {
  rotation?: number;
  maxDimension?: number;
  quality?: number;
}

export function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });
}

function getRotatedSize(width: number, height: number, rotationDeg: number): { width: number; height: number } {
  const rotRad = (rotationDeg * Math.PI) / 180;
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

/**
 * Recorta (e opcionalmente rotaciona e redimensiona) a imagem a partir das coordenadas de pixel.
 * Converte o resultado automaticamente para WebP otimizado.
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  fileName: string = "cropped-image.webp",
  options: CropImageOptions = {}
): Promise<File> {
  const image = await createImage(imageSrc);
  const rotation = options.rotation ?? 0;
  const maxDimension = options.maxDimension ?? 1024;
  const quality = options.quality ?? 0.9;

  let source: CanvasImageSource = image;

  if (rotation % 360 !== 0) {
    const rotatedCanvas = document.createElement("canvas");
    const rotCtx = rotatedCanvas.getContext("2d");
    if (!rotCtx) {
      throw new Error("Não foi possível inicializar o contexto 2D para rotação.");
    }
    const { width: bBoxW, height: bBoxH } = getRotatedSize(image.width, image.height, rotation);
    rotatedCanvas.width = Math.max(1, Math.round(bBoxW));
    rotatedCanvas.height = Math.max(1, Math.round(bBoxH));

    rotCtx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
    rotCtx.rotate((rotation * Math.PI) / 180);
    rotCtx.translate(-image.width / 2, -image.height / 2);
    rotCtx.drawImage(image, 0, 0);
    source = rotatedCanvas;
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Não foi possível inicializar o contexto 2D do Canvas.");
  }

  const cropWidth = Math.max(1, Math.round(pixelCrop.width));
  const cropHeight = Math.max(1, Math.round(pixelCrop.height));
  const scale = maxDimension > 0 ? Math.min(1, maxDimension / Math.max(cropWidth, cropHeight)) : 1;
  const targetWidth = Math.max(1, Math.round(cropWidth * scale));
  const targetHeight = Math.max(1, Math.round(cropHeight * scale));

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    source,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    targetWidth,
    targetHeight
  );

  const normalizedName = fileName.toLowerCase().endsWith(".webp")
    ? fileName
    : `${fileName.replace(/\.[^.]+$/, "")}.webp`;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Falha ao gerar o arquivo recortado no Canvas."));
          return;
        }
        const mimeType = blob.type || "image/webp";
        const file = new File([blob], normalizedName, { type: mimeType });
        resolve(file);
      },
      "image/webp",
      quality
    );
  });
}
