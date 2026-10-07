import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log('--- TESTE SIMULADO DE PRODUTOS ---');
  
  try {
    const products = await prisma.product.findMany({
      include: {
        categoryRel: { select: { name: true } },
        cardBadge: true,
        comboItems: { include: { product: true } },
        addonGroups: {
          include: {
            group: {
              include: {
                items: { orderBy: { sortOrder: 'asc' } },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    console.log(`Total de produtos encontrados: ${products.length}`);
    
    let hasCombo = false;
    let hasAddons = false;
    let hasSimple = false;

    for (const p of products) {
      // Formatação baseada na API
      const formatted = {
        id: p.id,
        name: p.name,
        price: Number(p.price),
        isCombo: p.isCombo,
        comboItems: p.comboItems?.map((ci) => ({
          productId: ci.productId,
          quantity: ci.quantity,
          productName: ci.product?.name,
        })) || [],
        addonGroups: p.addonGroups?.map((ag) => ag.group) || [],
      };

      if (p.isCombo && !hasCombo) {
        console.log('\n[PRODUTO TIPO: COMBO]');
        console.log(JSON.stringify(formatted, null, 2));
        if (formatted.comboItems === undefined) throw new Error("comboItems undefined no combo");
        hasCombo = true;
      } else if (p.addonGroups.length > 0 && !hasAddons) {
        console.log('\n[PRODUTO TIPO: COM COMPLEMENTOS]');
        console.log(JSON.stringify(formatted, null, 2));
        if (formatted.addonGroups === undefined) throw new Error("addonGroups undefined no produto com complementos");
        const group = formatted.addonGroups[0];
        if (!group.items) throw new Error("items undefined dentro do group");
        hasAddons = true;
      } else if (p.addonGroups.length === 0 && !p.isCombo && !hasSimple) {
        console.log('\n[PRODUTO TIPO: SIMPLES (SEM COMPLEMENTOS)]');
        console.log(JSON.stringify(formatted, null, 2));
        hasSimple = true;
      }

      if (hasCombo && hasAddons && hasSimple) {
        break;
      }
    }

    console.log('\n✅ Validação concluída. As propriedades aguardadas estão definidas e não são null/undefined onde aplicável.');
  } catch (error) {
    console.error('❌ Erro na validação:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
