import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

export const dynamic = "force-dynamic";

const MIME_BY_EXT: Record<string, string> = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const segments = Array.isArray(resolvedParams?.path) ? resolvedParams.path : [];
    if (segments.length === 0) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Bloqueia tentativa de path traversal
    if (segments.some((seg) => !seg || seg === "." || seg === ".." || seg.includes("\\"))) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const uploadsRoot = path.resolve(process.cwd(), "public", "uploads");
    const targetPath = path.resolve(uploadsRoot, ...segments);

    if (!targetPath.startsWith(uploadsRoot + path.sep)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const fileBuffer = await fs.readFile(targetPath);
    const ext = path.extname(targetPath).toLowerCase();
    const contentType = MIME_BY_EXT[ext] || "application/octet-stream";

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "ENOENT" || code === "EISDIR") {
      return new NextResponse("Not Found", { status: 404 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
