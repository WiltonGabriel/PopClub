export interface CustomizationOptionItem {
  id: string;
  name: string;
  price: number; // 0 para grátis
  description?: string;
  isPopular?: boolean;
}

export interface CustomizationGroup {
  id: string;
  name: string; // Ex: "Camadas", "Descartáveis", "Adicionais"
  instruction: string; // Ex: "Escolha 1 opção", "Escolha até 6 opções"
  required: boolean;
  min: number;
  max: number;
  options: CustomizationOptionItem[];
}

export interface ProductCustomizationConfig {
  preparationNotice?: string;
  originalPrice?: number;
  promotionalTag?: string;
  groups: CustomizationGroup[];
}

export function getProductCustomization(product: {
  id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
}): ProductCustomizationConfig {
  const nameLower = product.name.toLowerCase();
  const catLower = (product.category || "").toLowerCase();

  const isSorvete = catLower.includes("sorvete") || nameLower.includes("sorvete");
  const isCombo = catLower.includes("combo") || nameLower.includes("combo");
  const isShake = nameLower.includes("shake") || catLower.includes("shake");

  // Preço original promocional (se for combo ou itens com desconto)
  const isPromo = isCombo || nameLower.includes("hits") || nameLower.includes("promo");
  const originalPrice = isPromo
    ? Number((product.price * 1.25).toFixed(2))
    : undefined;
  const promotionalTag = isPromo ? "Oferta Especial" : undefined;

  // 1. SORVETES ARTESANAIS
  if (isSorvete && !isShake) {
    return {
      preparationNotice:
        "⚠️ Embalagem Térmica Especial: Entregamos em embalagem isotérmica selada com lacre para manter a textura cremosa e gelada perfeita até a sua porta.",
      originalPrice,
      promotionalTag,
      groups: [
        {
          id: "recipiente",
          name: "Tipo de Recipiente",
          instruction: "Escolha 1 opção",
          required: true,
          min: 1,
          max: 1,
          options: [
            { id: "copo_termico", name: "No Copo Especial com Tampa Térmica", price: 0, isPopular: true },
            { id: "cestinha_wafer", name: "Acompanha Cestinha Wafer Crocante", price: 2.5 },
            { id: "taca_especial", name: "Taça Térmica Reforçada", price: 3.0 },
          ],
        },
        {
          id: "cobertura",
          name: "Caldas & Coberturas Líquidas",
          instruction: "Escolha até 2 opções",
          required: false,
          min: 0,
          max: 2,
          options: [
            { id: "calda_chocolate", name: "Calda de Chocolate Tradicional", price: 2.0, isPopular: true },
            { id: "calda_frutas", name: "Calda de Frutas Vermelhas Artesanal", price: 2.5, isPopular: true },
            { id: "calda_caramelo", name: "Calda de Caramelo Toffee", price: 2.0 },
            { id: "calda_maracuja", name: "Calda de Maracujá com Sementes", price: 2.5 },
          ],
        },
        {
          id: "toppings",
          name: "Toppings & Confeitos Crocantes",
          instruction: "Escolha até 4 opções",
          required: false,
          min: 0,
          max: 4,
          options: [
            { id: "castanha", name: "Castanha de Caju Moída", price: 3.5, isPopular: true },
            { id: "confete_mm", name: "Confetes de Chocolate M&M", price: 3.0, isPopular: true },
            { id: "chantilly", name: "Chantilly Fresco Batido", price: 3.0 },
            { id: "oreo", name: "Biscoito Oreo em Pedaços", price: 3.0 },
            { id: "chocoball", name: "Chocoball Crocante", price: 2.5 },
          ],
        },
        {
          id: "descartaveis",
          name: "Descartáveis & Colheres",
          instruction: "Escolha 1 opção",
          required: true,
          min: 1,
          max: 1,
          options: [
            { id: "com_colher", name: "Enviar colher e guardanapos descartáveis", price: 0, isPopular: true },
            { id: "sem_colher", name: "Não preciso de descartáveis (Eco-Friendly 🌱)", price: 0 },
          ],
        },
      ],
    };
  }

  // 2. COMBOS FAMÍLIA
  if (isCombo) {
    return {
      preparationNotice:
        "⚠️ Potes Separados: Para garantir a crocância e frescor, todos os adicionais secos (granola, paçoca, leite em pó) são enviados em potinhos lacrados individuais.",
      originalPrice,
      promotionalTag: "Super Combo Familiar",
      groups: [
        {
          id: "ponto_entrega",
          name: "Forma de Envio dos Copos",
          instruction: "Escolha 1 opção",
          required: true,
          min: 1,
          max: 1,
          options: [
            { id: "pronto_consumo", name: "Prontos para Consumo Imediato", price: 0, isPopular: true },
            { id: "embalagem_freezer", name: "Embalagem Especial com Tampa para Freezer", price: 3.0 },
          ],
        },
        {
          id: "potes_extras",
          name: "Potes Extras para a Família",
          instruction: "Escolha até 5 opções",
          required: false,
          min: 0,
          max: 5,
          options: [
            { id: "pote_ninho", name: "Pote Extra de Leite Ninho (100g)", price: 5.0, isPopular: true },
            { id: "pote_granola", name: "Pote Extra de Granola Crocante (100g)", price: 4.5, isPopular: true },
            { id: "pote_nutella", name: "Pote Extra de Nutella Original (80g)", price: 8.0, isPopular: true },
            { id: "pote_pacoca", name: "Pote de Paçoca Caseira (100g)", price: 4.0 },
            { id: "pote_morango", name: "Pote de Morango Fresco Picado (120g)", price: 6.0 },
          ],
        },
        {
          id: "descartaveis",
          name: "Descartáveis para o Combo",
          instruction: "Escolha 1 opção",
          required: true,
          min: 1,
          max: 1,
          options: [
            { id: "com_colheres", name: "Enviar colheres para todos os copos", price: 0, isPopular: true },
            { id: "sem_colheres", name: "Não preciso de descartáveis (Eco-Friendly 🌱)", price: 0 },
          ],
        },
      ],
    };
  }

  // 3. PADRÃO AÇAÍS (Copos Tradicionais, Hits, Marmitas, Explosão de Recheio)
  return {
    preparationNotice:
      "⚠️ Aviso de Preparo: Para manter a consistência e cremosidade ideais durante o transporte, caldas quentes e cremes densos (Nutella/Ninho trufado) são concentrados no topo e em camadas intermediárias estratégicas.",
    originalPrice,
    promotionalTag: isPromo ? "Destaque da Vitrine" : undefined,
    groups: [
      {
        id: "camadas",
        name: "Camadas & Base do Açaí",
        instruction: "Escolha 1 opção",
        required: true,
        min: 1,
        max: 1,
        options: [
          { id: "tradicional", name: "Tradicional (Açaí puro batido cremoso)", price: 0, isPopular: true },
          { id: "com_banana", name: "Açaí batido na hora com Banana", price: 0, isPopular: true },
          { id: "com_morango", name: "Açaí batido na hora com Morango", price: 2.0 },
          { id: "duo_cupuacu", name: "Duo 50% Açaí + 50% Cupuaçu Artesanal", price: 2.5 },
        ],
      },
      {
        id: "adicionais",
        name: "Recheios & Adicionais Especiais",
        instruction: "Escolha até 6 opções",
        required: false,
        min: 0,
        max: 6,
        options: [
          { id: "leite_ninho", name: "Leite em Pó (Ninho Original)", price: 2.5, isPopular: true },
          { id: "nutella", name: "Nutella Pura (Creme de Avelã Ferrero)", price: 6.5, isPopular: true },
          { id: "ninho_trufado", name: "Creme de Ninho Trufado Caseiro", price: 4.5, isPopular: true },
          { id: "pacoca", name: "Paçoca de Amendoim Artesanal", price: 2.0 },
          { id: "granola", name: "Granola Tradicional Crocante", price: 2.0, isPopular: true },
          { id: "gotas_chocolate", name: "Gotas de Chocolate Nobre Meio Amargo", price: 3.5 },
          { id: "ovomaltine", name: "Ovomaltine Flocos Crocantes", price: 3.0 },
          { id: "leite_condensado", name: "Leite Condensado Moça", price: 2.5 },
          { id: "avela_crunch", name: "Creme de Avelã Crunch", price: 5.0 },
          { id: "chocoball", name: "Chocoball Crocante", price: 2.5 },
        ],
      },
      {
        id: "frutas",
        name: "Frutas Frescas",
        instruction: "Escolha até 3 opções",
        required: false,
        min: 0,
        max: 3,
        options: [
          { id: "banana", name: "Banana Fresca Fatiada na Hora", price: 2.0, isPopular: true },
          { id: "morango", name: "Morango Fresco Picado Selecionado", price: 4.0, isPopular: true },
          { id: "kiwi", name: "Kiwi em Rodelas", price: 3.5 },
          { id: "uva_thompson", name: "Uva Thompson sem Semente", price: 3.5 },
        ],
      },
      {
        id: "caldas",
        name: "Caldas & Coberturas no Topo",
        instruction: "Escolha até 2 opções",
        required: false,
        min: 0,
        max: 2,
        options: [
          { id: "calda_morango", name: "Calda de Morango Artesanal", price: 2.0, isPopular: true },
          { id: "calda_caramelo", name: "Calda de Caramelo Salgado Gourmet", price: 2.5 },
          { id: "calda_chocolate_belga", name: "Calda de Chocolate Belga", price: 3.0 },
          { id: "mel", name: "Mel Silvestre Puro", price: 3.0 },
        ],
      },
      {
        id: "descartaveis",
        name: "Descartáveis & Colheres",
        instruction: "Escolha 1 opção",
        required: true,
        min: 1,
        max: 1,
        options: [
          { id: "com_colher", name: "Enviar colher e guardanapos descartáveis", price: 0, isPopular: true },
          { id: "sem_colher", name: "Não preciso de descartáveis (Eco-Friendly 🌱)", price: 0 },
        ],
      },
    ],
  };
}
