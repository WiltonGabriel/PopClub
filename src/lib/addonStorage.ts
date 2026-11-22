import path from "path";
import fs from "fs/promises";

interface AddonImageRefDb {
  addonItem: {
    count: (args: {
      where: {
        imageUrl: string;
        id?: { notIn: string[] };
      };
    }) => Promise<number>;
  };
}

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

/**
 * Exclui fisicamente a miniatura do addon apenas se nenhum outro registro
 * ainda referenciar o mesmo imageUrl no banco (proteção contra compartilhamento).
 */
export async function deleteAddonImageIfUnused(
  db: AddonImageRefDb,
  imageUrl?: string | null,
  excludeItemIds: string[] = []
): Promise<boolean> {
  if (!imageUrl || typeof imageUrl !== "string") return false;
  if (!imageUrl.startsWith("/uploads/addons/")) return false;

  const remainingCount = await db.addonItem.count({
    where: {
      imageUrl,
      ...(excludeItemIds.length > 0 ? { id: { notIn: excludeItemIds } } : {}),
    },
  });

  if (remainingCount > 0) {
    return false;
  }

  await deleteAddonImageFile(imageUrl);
  return true;
}
