export interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
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

/**
 * Recorta a imagem a partir de um elemento HTMLImageElement e das coordenadas de pixel.
 * Retorna um objeto File com a imagem recortada.
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  fileName: string = "cropped-image.webp"
): Promise<File> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Não foi possível inicializar o contexto 2D do Canvas.");
  }

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Falha ao gerar o arquivo recortado no Canvas."));
          return;
        }
        const file = new File([blob], fileName, { type: "image/webp" });
        resolve(file);
      },
      "image/webp",
      0.95
    );
  });
}
