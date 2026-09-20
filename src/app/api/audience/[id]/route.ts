import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function DELETE(request: Request, context: any) {
  try {
    const { id } = context.params;

    if (!id) {
      return NextResponse.json({ error: "ID não fornecido." }, { status: 400 });
    }

    await prisma.customAudienceList.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro ao excluir lista personalizada:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
