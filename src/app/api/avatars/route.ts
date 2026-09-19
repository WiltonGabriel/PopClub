import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_AVATARS = [
  { id: "preset_1", name: "Sundae Amora", description: "Clássico sundae com calda de amora", imageUrl: "/avatars/avatar-sorvete.svg", category: "Sobremesas", order: 1 },
  { id: "preset_2", name: "Tigela de Açaí", description: "Açaí cremoso com banana e morango", imageUrl: "/avatars/avatar-acai.svg", category: "Açaí", order: 2 },
  { id: "preset_3", name: "Milk Shake", description: "Milk shake cremoso refrescante", imageUrl: "/avatars/avatar-shake.svg", category: "Bebidas", order: 3 },
  { id: "preset_4", name: "Picolé Frutas", description: "Picolé artesanal de frutas tropicais", imageUrl: "/avatars/avatar-picole.svg", category: "Picolés", order: 4 },
  { id: "preset_5", name: "Morango Pop", description: "Morango doce e selecionado", imageUrl: "/avatars/avatar-morango.svg", category: "Frutas", order: 5 },
  { id: "preset_6", name: "Banana Split", description: "Banana ouro com toque especial", imageUrl: "/avatars/avatar-banana.svg", category: "Frutas", order: 6 },
  { id: "preset_7", name: "Cookie Choco", description: "Cookie crocante com gotas de chocolate", imageUrl: "/avatars/avatar-cookie.svg", category: "Gourmet", order: 7 },
  { id: "preset_8", name: "Cereja Pop", description: "Toque final irresistível", imageUrl: "/avatars/avatar-cereja.svg", category: "Frutas", order: 8 },
  { id: "preset_9", name: "Casquinha Dupla", description: "Casquinha crocante com dois sabores", imageUrl: "/avatars/avatar-casquinha.svg", category: "Sorvetes", order: 9 },
  { id: "preset_10", name: "Mestre Gelateiro", description: "Toque profissional de confeitaria", imageUrl: "/avatars/avatar-chef.svg", category: "Especiais", order: 10 },
];

export async function GET() {
  try {
    let avatars = await prisma.avatarPreset.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });

    // Auto-seed defensivo caso a tabela esteja limpa
    if (avatars.length === 0) {
      for (const av of DEFAULT_AVATARS) {
        await prisma.avatarPreset.upsert({
          where: { id: av.id },
          update: {
            name: av.name,
            description: av.description,
            imageUrl: av.imageUrl,
            category: av.category,
            order: av.order,
            isActive: true,
          },
          create: {
            id: av.id,
            name: av.name,
            description: av.description,
            imageUrl: av.imageUrl,
            category: av.category,
            order: av.order,
            isActive: true,
          },
        });
      }

      avatars = await prisma.avatarPreset.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
      });
    }

    return NextResponse.json(avatars);
  } catch (error: any) {
    console.error("Erro ao buscar avatares oficiais:", error);
    // Em caso de falha transitória de banco, retorna a lista padrão estática com status 200
    return NextResponse.json(DEFAULT_AVATARS);
  }
}
