"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { productService, Product } from "../services/productService";
import { categoryService, Category } from "../services/categoryService";
import { useAuth } from "../hooks/useAuth";
import { useCart } from "../hooks/useCart";
import { CategoryFormDialog } from "../components/admin/CategoryFormDialog";
import { ProductFormDialog } from "../components/admin/ProductFormDialog";
import { PromoBanner } from "../components/storefront/PromoBanner";
import { Button } from "../components/ui/button";
import { Edit2, Trash2, Plus, IceCream, Coffee, Utensils, ShoppingBag, Zap, User as UserIcon } from "lucide-react";

export default function Storefront() {
  const { isAdmin, user } = useAuth();
  const { addItem, totalItems, itemsTotal } = useCart();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  
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

  const getCategoryIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("açaí") || lowerName.includes("acai")) return <IceCream className="w-5 h-5 mb-1 text-primary" />;
    if (lowerName.includes("sorvete")) return <IceCream className="w-5 h-5 mb-1 text-secondary" />;
    if (lowerName.includes("shake")) return <Coffee className="w-5 h-5 mb-1 text-primary" />;
    if (lowerName.includes("combo")) return <Zap className="w-5 h-5 mb-1 text-yellow-400" />;
    return <Utensils className="w-5 h-5 mb-1 text-muted-foreground" />;
  };

  const filteredProducts = search.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.description.toLowerCase().includes(search.toLowerCase())
      )
    : products;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-background/90 border-b-2 border-border px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-heading font-black tracking-tighter uppercase text-foreground">
            Pop<span className="text-primary">Club</span>
          </span>
        </div>
        
        <div className="hidden md:flex flex-1 max-w-xl mx-8">
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por açaí, sorvetes..." 
            className="w-full bg-muted border-2 border-border rounded-none px-6 py-2.5 outline-none focus:border-secondary transition-colors font-mono text-sm placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/carrinho"
            className="flex items-center gap-2 border-2 border-primary bg-primary/10 text-primary px-3 py-2 hover:bg-primary hover:text-primary-foreground transition-colors font-mono text-xs uppercase tracking-widest font-bold"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">Carrinho</span> ({totalItems})
          </Link>

          <Link href="/pedidos" className="text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors hidden md:flex items-center gap-2 border-2 border-border px-3 py-2 hover:bg-white/5">
            Meus Pedidos
          </Link>
          
          {user ? (
            <Link href="/conta" className="flex items-center gap-2 border-2 border-border px-3 py-2 hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors font-mono text-xs uppercase tracking-widest">
              <UserIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Conta</span>
            </Link>
          ) : (
            <Link href="/login" className="flex items-center gap-2 border-2 border-border px-3 py-2 hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors font-mono text-xs uppercase tracking-widest">
              <UserIcon className="w-4 h-4" />
              Entrar
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6">
        {/* Carrossel Dinâmico de Promoções (PostgreSQL) */}
        <PromoBanner />

        {/* Barra de Categorias */}
        <section className="mb-10 sticky top-[72px] z-30 bg-background/95 backdrop-blur py-2 border-b-2 border-border">
          <div className="flex overflow-x-auto gap-4 no-scrollbar items-center pb-2">
            {categories.map((cat) => (
              <div key={cat.id} className="relative group shrink-0">
                <a 
                  href={`#category-${cat.id}`}
                  className="flex flex-col items-center justify-center min-w-[80px] p-3 rounded-none border-2 border-transparent hover:border-border hover:bg-muted transition-colors cursor-pointer"
                >
                  {getCategoryIcon(cat.name)}
                  <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground mt-1 text-center whitespace-nowrap">{cat.name}</span>
                </a>

                {isAdmin && (
                  <div className="absolute -top-2 -right-2 hidden group-hover:flex gap-1 bg-background p-1 border-2 border-border z-10 shadow-lg">
                    <button onClick={() => { setEditingCategory(cat); setCatDialogOpen(true); }} className="text-xs text-primary p-1 hover:bg-muted transition-colors"><Edit2 className="w-3 h-3" /></button>
                    <button onClick={() => handleDeleteCategory(cat.id)} className="text-xs text-destructive p-1 hover:bg-muted transition-colors"><Trash2 className="w-3 h-3" /></button>
                  </div>
                )}
              </div>
            ))}

            {isAdmin && (
              <Button 
                variant="outline" 
                className="rounded-none border-2 border-dashed border-muted-foreground/50 text-muted-foreground hover:text-white h-20 w-20 flex flex-col items-center justify-center shrink-0 bg-transparent"
                onClick={() => { setEditingCategory(null); setCatDialogOpen(true); }}
              >
                <Plus className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-mono uppercase">Nova</span>
              </Button>
            )}
          </div>
        </section>

        {/* Lista de Produtos Agrupados por Categoria */}
        <div className="space-y-12">
          {categories.map((cat) => {
            const catProducts = filteredProducts.filter(p => p.category_id === cat.id || p.category === cat.name);
            
            if (catProducts.length === 0 && !isAdmin) return null;

            return (
              <section key={cat.id} id={`category-${cat.id}`} className="scroll-mt-36">
                <div className="flex items-center justify-between mb-4 border-b-2 border-border pb-2">
                  <h2 className="font-heading text-xl font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    {cat.name}
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {catProducts.map((product) => (
                    <div 
                      key={product.id} 
                      className="bg-card border-2 border-border hover:border-accent transition-colors flex h-32 relative overflow-hidden group shadow-[2px_2px_0px_0px_rgba(255,255,255,0.02)]"
                    >
                      {isAdmin && (
                        <div className="absolute top-2 right-14 flex gap-1 z-20 bg-background/90 p-1 border border-border">
                          <button onClick={() => { setEditingProduct(product); setProdDialogOpen(true); }} className="text-primary hover:bg-muted p-1"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDeleteProduct(product.id)} className="text-destructive hover:bg-muted p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      )}

                      <div className="w-32 bg-muted relative shrink-0 border-r-2 border-border overflow-hidden flex items-center justify-center">
                        {product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.imageUrl} alt={product.name} className="object-cover w-full h-full group-hover:scale-105 transition-transform" />
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground tracking-widest uppercase">POPSHAKE</span>
                        )}
                      </div>
                      
                      <div className="p-3 flex flex-col flex-1 min-w-0">
                        <h3 className="font-heading font-bold text-foreground text-base truncate">{product.name}</h3>
                        <p className="text-xs font-sans text-muted-foreground line-clamp-2 mt-1 leading-snug flex-1">{product.description}</p>
                        
                        <div className="flex items-end justify-between mt-2">
                          <span className="font-mono font-bold text-primary text-sm">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Botão de Adicionar ao Carrinho */}
                      <button
                        onClick={() => {
                          addItem({
                            productId: product.id,
                            name: product.name,
                            price: product.price,
                            originalPrice: product.price,
                            quantity: 1,
                            imageUrl: product.imageUrl,
                          });
                        }}
                        className="w-12 border-l-2 border-border bg-background hover:bg-success hover:text-white flex flex-col items-center justify-center text-success transition-colors group/btn shrink-0"
                        title="Adicionar ao carrinho"
                      >
                        <Plus className="w-6 h-6 group-hover/btn:scale-125 transition-transform" />
                      </button>
                    </div>
                  ))}

                  {isAdmin && (
                    <button 
                      onClick={() => { setEditingProduct(null); setProdDialogOpen(true); }}
                      className="border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border transition-all h-32 bg-transparent hover:bg-white/5"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      <span className="font-mono text-xs uppercase tracking-wider">Novo Produto</span>
                    </button>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </main>

      {/* Floating Cart Mobile */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 w-full md:hidden bg-background border-t-2 border-border p-3 z-40 shadow-2xl">
          <Link href="/carrinho">
            <Button className="w-full h-12 bg-primary hover:bg-primary/90 rounded-none font-heading text-base uppercase tracking-wider text-background flex justify-between px-4">
              <span className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                Ver Carrinho ({totalItems})
              </span>
              <span className="font-mono font-bold">
                R$ {itemsTotal.toFixed(2).replace(".", ",")}
              </span>
            </Button>
          </Link>
        </div>
      )}

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
