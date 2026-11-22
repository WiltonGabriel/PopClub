import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import sharp from "sharp";
import { getAuthUser } from "@/lib/auth";
import { addonUploadLimiter, getIpFromRequest, createRateLimitResponse } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { deleteAddonImageIfUnused } from "@/lib/addonStorage";
import { hasPermission } from "@/lib/permissions";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

export async function POST(request: Request) {
  try {
    // 1. Rate Limiting (20 uploads/min por IP)
    const ip = getIpFromRequest(request);
    const limitCheck = addonUploadLimiter.check(ip);
    if (!limitCheck.success) {
      return createRateLimitResponse(
        limitCheck,
        "Muitos uploads de miniaturas em sequência. Aguarde um instante para enviar novamente."
      );
    }

    // 2. Autenticação Administrativa
    const user = await getAuthUser(request);
    if (!hasPermission(user, "menu_manage")) {
      return NextResponse.json(
        { error: "Acesso negado. Permissão para gerenciar complementos necessária." },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const oldImageUrl = (formData.get("oldImageUrl") || formData.get("previousImageUrl")) as string | null;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    // 3. Validação de extensão
    const ext = path.extname(file.name || "").toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `Extensão '${ext}' não permitida. Envie arquivos PNG, JPEG ou WebP.` },
        { status: 400 }
      );
    }

    // 4. Validação de formato MIME
    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase()) && file.type !== "") {
      return NextResponse.json(
        { error: `Formato '${file.type}' inválido. Envie arquivos PNG, JPEG ou WebP.` },
        { status: 400 }
      );
    }

    // 5. Validação de Tamanho (Máximo 2 MB)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `O arquivo excede o limite de 2 MB (tamanho: ${(file.size / (1024 * 1024)).toFixed(2)} MB).` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadDir = path.join(process.cwd(), "public", "uploads", "addons");
    await fs.mkdir(uploadDir, { recursive: true });

    // 6. Processamento com Sharp: até 320x320 px preservando proporção livre + WebP qualidade 85
    const filename = `${crypto.randomUUID()}.webp`;
    const filePath = path.join(uploadDir, filename);

    const webpBuffer = await sharp(buffer)
      .resize({
        width: 320,
        height: 320,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality: 85,
        effort: 4,
      })
      .toBuffer();

    await fs.writeFile(filePath, webpBuffer);

    // 7. Limpeza Segura de Imagem Órfã Anterior (só exclui se nenhum item ainda referenciar)
    if (oldImageUrl) {
      await deleteAddonImageIfUnused(prisma, oldImageUrl);
    }

    const publicUrl = `/uploads/addons/${filename}`;
    return NextResponse.json({
      success: true,
      url: publicUrl,
      size: webpBuffer.length,
      format: "webp",
    });
  } catch (error: unknown) {
    console.error("Erro no processamento da miniatura do complemento:", error);
    return NextResponse.json(
      { error: "Falha ao processar e otimizar a miniatura do complemento." },
      { status: 500 }
    );
  }
}
