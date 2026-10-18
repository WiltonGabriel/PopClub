import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import sharp from "sharp";
import { getAuthUser } from "@/lib/auth";
import { addonUploadLimiter, getIpFromRequest, createRateLimitResponse } from "@/lib/rateLimit";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/x-icon",
  "image/vnd.microsoft.icon",
  "image/svg+xml",
  "image/gif",
];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".ico", ".svg", ".gif"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(request: Request) {
  try {
    const ip = getIpFromRequest(request);
    const limitCheck = addonUploadLimiter.check(ip);
    if (!limitCheck.success) {
      return createRateLimitResponse(
        limitCheck,
        "Muitos uploads em sequência. Aguarde um instante para processarmos suas imagens."
      );
    }

    // 0. Autenticação estrita no servidor (Apenas administradores podem fazer upload)
    const authUser = await getAuthUser(request);
    if (!authUser || authUser.role !== "admin") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores autenticados podem enviar arquivos." },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const targetType = (formData.get("type") as string) || "general"; // 'product' | 'banner' | 'favicon' | 'general'

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    // 1. Validação estrita de extensão do arquivo
    const originalExtension = path.extname(file.name || "").toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(originalExtension)) {
      return NextResponse.json(
        {
          error: `Extensão de arquivo não permitida (${originalExtension || "desconhecida"}). Formatos aceitos: ICO, PNG, SVG, JPG, GIF e WebP.`,
        },
        { status: 400 }
      );
    }

    // 2. Validação estrita de formato MIME
    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase()) && file.type !== "") {
      return NextResponse.json(
        {
          error: `Formato de arquivo não suportado (${file.type}). Permitidos: ICO, PNG, SVG, JPG, GIF e WebP.`,
        },
        { status: 400 }
      );
    }

    // 3. Validação de tamanho máximo (5 MB)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `O arquivo enviado excede o limite máximo permitido de 5MB (tamanho atual: ${(file.size / (1024 * 1024)).toFixed(2)}MB).`,
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadDir = path.join(process.cwd(), "public", "uploads");

    // Garante que o diretório public/uploads existe
    await fs.mkdir(uploadDir, { recursive: true });

    // Validação avançada para prevenir injeção de script em arquivos SVG
    if (originalExtension === ".svg" || file.type.includes("svg")) {
      const svgText = buffer.toString("utf-8");
      if (
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(svgText) ||
        /\bon\w+\s*=/gi.test(svgText) ||
        /javascript:/gi.test(svgText)
      ) {
        return NextResponse.json(
          { error: "Upload negado. Arquivos SVG não devem conter scripts ou tratadores de evento (XSS Prevention)." },
          { status: 400 }
        );
      }
    }

    // 4. Tratamento Especial para Favicon e Categorias (.ico e .svg gravados diretamente; outros convertidos/redimensionados)
    if (targetType === "favicon" || targetType === "category") {
      if (originalExtension === ".ico" || originalExtension === ".svg") {
        const filename = `${targetType}-${crypto.randomUUID()}${originalExtension}`;
        const filePath = path.join(uploadDir, filename);
        await fs.writeFile(filePath, buffer);

        return NextResponse.json({
          url: `/uploads/${filename}`,
          size: buffer.length,
          format: originalExtension.replace(".", ""),
        });
      }

      if (targetType === "favicon") {
        // Imagens raster (PNG, JPG, WebP, GIF) para favicon: redimensiona 64x64 PNG de alta qualidade
        const filename = `favicon-${crypto.randomUUID()}.png`;
        const filePath = path.join(uploadDir, filename);

        const pngBuffer = await sharp(buffer)
          .resize({
            width: 64,
            height: 64,
            fit: "contain",
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .png({ quality: 95 })
          .toBuffer();

        await fs.writeFile(filePath, pngBuffer);

        return NextResponse.json({
          url: `/uploads/${filename}`,
          size: pngBuffer.length,
          format: "png",
        });
      }
    }

    // 5. Otimização e Conversão Compulsória para WebP via Sharp para produtos, categorias e banners
    const filename = `${crypto.randomUUID()}.webp`;
    const filePath = path.join(uploadDir, filename);

    let sharpInstance = sharp(buffer);
    const metadata = await sharpInstance.metadata();

    // Redimensiona proporcionalmente para dimensões ideais do layout
    if (targetType === "banner") {
      // Banners de promoção: largura máxima de 1200px
      sharpInstance = sharpInstance.resize({
        width: 1200,
        height: 675,
        fit: "inside",
        withoutEnlargement: true,
      });
    } else if (targetType === "product" || targetType === "category") {
      // Produtos e Categorias: quadrado máximo de 512x512px
      sharpInstance = sharpInstance.resize({
        width: 512,
        height: 512,
        fit: "inside",
        withoutEnlargement: true,
      });
    } else {
      // Padrão geral: até 1200px mantendo proporção
      if ((metadata.width || 0) > 1200 || (metadata.height || 0) > 1200) {
        sharpInstance = sharpInstance.resize({
          width: 1200,
          height: 1200,
          fit: "inside",
          withoutEnlargement: true,
        });
      }
    }

    // Conversão obrigatória para WebP com compressão otimizada (qualidade 82)
    const webpBuffer = await sharpInstance
      .webp({ quality: 82, effort: 4 })
      .toBuffer();

    await fs.writeFile(filePath, webpBuffer);

    const publicUrl = `/uploads/${filename}`;
    return NextResponse.json({
      url: publicUrl,
      size: webpBuffer.length,
      format: "webp",
    });
  } catch (error: unknown) {
    console.error("Erro no processamento da imagem com Sharp:", error);
    return NextResponse.json(
      { error: "Falha ao otimizar e converter a imagem no servidor." },
      { status: 500 }
    );
  }
}
