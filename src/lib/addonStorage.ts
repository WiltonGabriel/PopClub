import path from "path";
import fs from "fs/promises";

/**
 * Remove fisicamente o arquivo de miniatura do addon do disco, caso resida em /uploads/addons/
 */
export async function deleteAddonImageFile(imageUrl?: string | null): Promise<void> {
  if (!imageUrl || typeof imageUrl !== "string") return;
  if (!imageUrl.startsWith("/uploads/addons/")) return;

  try {
    const filename = path.basename(imageUrl);
    // Impede qualquer tentativa de traversal
    if (!filename || filename === "." || filename === "..") return;

    const fullPath = path.join(process.cwd(), "public", "uploads", "addons", filename);
    await fs.unlink(fullPath);
  } catch (err: unknown) {
    const errorWithCode = err as { code?: string };
    if (errorWithCode?.code !== "ENOENT") {
      console.warn("Aviso ao excluir imagem de addon:", err);
    }
  }
}
