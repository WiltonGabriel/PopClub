"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { productService, Product } from "../services/productService";
import { categoryService, Category } from "../services/categoryService";
import { useAuth } from "../hooks/useAuth";
import { AuthModal } from "../components/auth/AuthModal";
import { CategoryFormDialog } from "../components/admin/CategoryFormDialog";
import { ProductFormDialog } from "../components/admin/ProductFormDialog";
import { Button } from "../components/ui/button";

export default function Storefront() {
  const { isAdmin } = useAuth();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("Todos");
  
  // Modals state
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  const [prodDialogOpen, setProdDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [cats, prods] = await Promise.all([
        categoryService.getCategories(),
        productService.getProducts()
      ]);
      setCategories(cats);
      setProducts(prods);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm("Deletar esta categoria? Produtos associados perderão o vínculo.")) {
      await categoryService.deleteCategory(id);
      setCategories(categories.filter(c => c.id !== id));
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm("Tem certeza que deseja deletar este produto?")) {
      await productService.deleteProduct(id);
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const filteredProducts = activeCategory === "Todos" 
    ? products 
    : products.filter(p => p.category_id === activeCategory || p.category === activeCategory);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-surface/80 border-b border-white/10 px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold tracking-tight text-white">
            Pop<span className="text-primary">Club</span>
          </span>
        </div>
        
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <input 
            type="text" 
            placeholder="O que você deseja pedir hoje?" 
            className="w-full bg-white/5 border border-white/10 rounded-full px-6 py-2 outline-none focus:border-primary transition-all text-sm"
          />
        </div>

        <div className="flex items-center gap-4">
          <Link href="/rastreamento" className="text-sm text-muted-foreground hover:text-white hidden md:block">
            Rastrear Pedido
          </Link>
          <AuthModal />
          <button className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-full text-sm font-semibold transition-colors shadow-[0_4px_14px_rgba(148,0,104,0.4)]">
            🛒 Carrinho
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-8">
        
        {/* Category Navigation */}
        <section className="mb-10">
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={() => setActiveCategory("Todos")}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                activeCategory === "Todos" 
                  ? "bg-primary text-white shadow-[0_4px_10px_rgba(148,0,104,0.3)]" 
                  : "bg-white/5 text-muted-foreground hover:bg-white/10"
              }`}
            >
              Todos
            </button>

            {categories.map((cat) => (
              <div key={cat.id} className="relative group">
                <button 
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                    activeCategory === cat.id 
                      ? "bg-primary text-white shadow-[0_4px_10px_rgba(148,0,104,0.3)]" 
                      : "bg-white/5 text-muted-foreground hover:bg-white/10"
                  }`}
                >
                  {cat.name}
                </button>

                {isAdmin && (
                  <div className="absolute -top-3 -right-3 hidden group-hover:flex gap-1 bg-surface p-1 rounded-md shadow-xl border border-white/10 z-10">
                    <button onClick={() => { setEditingCategory(cat); setCatDialogOpen(true); }} className="text-xs text-blue-400 p-1 hover:bg-white/10 rounded">✏️</button>
                    <button onClick={() => handleDeleteCategory(cat.id)} className="text-xs text-red-400 p-1 hover:bg-white/10 rounded">🗑️</button>
                  </div>
                )}
              </div>
            ))}

            {isAdmin && (
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-full border-dashed border-white/20 text-muted-foreground hover:text-white"
                onClick={() => { setEditingCategory(null); setCatDialogOpen(true); }}
              >
                + Categoria
              </Button>
            )}
          </div>
        </section>

        {/* Product Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div key={product.id} className="group relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 hover:border-primary/50 transition-all duration-300 flex flex-col">
              
              {isAdmin && (
                <div className="absolute top-2 right-2 flex gap-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditingProduct(product); setProdDialogOpen(true); }} className="bg-surface/80 backdrop-blur text-sm p-2 rounded-full hover:bg-primary text-white transition-colors">✏️</button>
                  <button onClick={() => handleDeleteProduct(product.id)} className="bg-surface/80 backdrop-blur text-sm p-2 rounded-full hover:bg-destructive text-white transition-colors">🗑️</button>
                </div>
              )}

              <div className="aspect-square w-full overflow-hidden relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={product.imageUrl} alt={product.name} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-5 flex flex-col flex-1">
                <h3 className="font-semibold text-lg text-white mb-1">{product.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">{product.description}</p>
                <div className="flex items-center justify-between mt-auto">
                  <span className="font-bold text-primary text-lg">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                  </span>
                  <button className="bg-white/10 hover:bg-primary text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors">
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}

          {isAdmin && (
            <button 
              onClick={() => { setEditingProduct(null); setProdDialogOpen(true); }}
              className="border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-muted-foreground hover:text-white hover:border-white/30 hover:bg-white/5 transition-all aspect-square min-h-[300px]"
            >
              <span className="text-4xl mb-2">+</span>
              <span className="font-medium">Novo Produto</span>
            </button>
          )}
        </section>
      </main>

      {/* Admin Modals */}
      <CategoryFormDialog 
        open={catDialogOpen} 
        onOpenChange={setCatDialogOpen} 
        categoryToEdit={editingCategory}
        onSaved={fetchData}
      />

      <ProductFormDialog 
        open={prodDialogOpen} 
        onOpenChange={setProdDialogOpen} 
        productToEdit={editingProduct}
        categories={categories}
        onSaved={fetchData}
      />
    </div>
  );
}
