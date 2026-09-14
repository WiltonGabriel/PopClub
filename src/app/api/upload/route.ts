import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import sharp from "sharp";
import { getAuthUser } from "@/lib/auth";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(request: Request) {
  try {
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
    const targetType = (formData.get("type") as string) || "general"; // 'product' | 'banner' | 'general'

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    // 1. Validação estrita de extensão do arquivo (bloqueia scripts, .svg com XSS, .html, .php, etc.)
    const originalExtension = path.extname(file.name || "").toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(originalExtension)) {
      return NextResponse.json(
        {
          error: `Extensão de arquivo não permitida (${originalExtension || "desconhecida"}). Apenas .jpg, .jpeg, .png e .webp são aceitos.`,
        },
        { status: 400 }
      );
    }

    // 2. Validação estrita de formato MIME
    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      return NextResponse.json(
        {
          error: `Formato de arquivo não suportado (${file.type}). Apenas imagens nos formatos JPEG, PNG ou WebP são permitidas.`,
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

    // 3. Otimização e Conversão Compulsória para WebP via Sharp
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
    } else if (targetType === "product") {
      // Produtos: quadrado máximo de 800x800px
      sharpInstance = sharpInstance.resize({
        width: 800,
        height: 800,
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
  } catch (error: any) {
    console.error("Erro no processamento da imagem com Sharp:", error);
    return NextResponse.json(
      { error: "Falha ao otimizar e converter a imagem no servidor." },
      { status: 500 }
    );
  }
}
