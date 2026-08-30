export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: "Açaí" | "Sorvetes" | "Shakes" | "Combos";
  imageUrl: string;
};

export const mockProducts: Product[] = [
  {
    id: "prod_1",
    name: "Açaí Tradicional (500ml)",
    description: "Açaí puro batido com xarope de guaraná. Acompanha granola e banana.",
    price: 18.90,
    category: "Açaí",
    imageUrl: "https://images.unsplash.com/photo-1590165482129-1b8b27698780?auto=format&fit=crop&q=80&w=600&h=400",
  },
  {
    id: "prod_2",
    name: "Pop Shake de Morango",
    description: "Milkshake cremoso de morango com chantilly e calda artesanal.",
    price: 15.50,
    category: "Shakes",
    imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&q=80&w=600&h=400",
  },
  {
    id: "prod_3",
    name: "Taça Supreme de Chocolate",
    description: "Sorvete de chocolate belga, pedaços de brownie e muita Nutella.",
    price: 24.90,
    category: "Sorvetes",
    imageUrl: "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&q=80&w=600&h=400",
  },
  {
    id: "prod_4",
    name: "Combo Casal Feliz",
    description: "2 Açaís de 300ml + 2 adicionais à sua escolha.",
    price: 32.00,
    category: "Combos",
    imageUrl: "https://images.unsplash.com/photo-1597491411516-834c20b8e617?auto=format&fit=crop&q=80&w=600&h=400",
  },
  {
    id: "prod_5",
    name: "Açaí Trufado (700ml)",
    description: "Açaí em camadas com creme de leite em pó, morangos frescos e ganache.",
    price: 28.50,
    category: "Açaí",
    imageUrl: "https://images.unsplash.com/photo-1626200419188-f58c70172cd9?auto=format&fit=crop&q=80&w=600&h=400",
  }
];
