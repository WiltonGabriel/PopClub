"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { productService, Product } from "../services/productService";
import { categoryService, Category } from "../services/categoryService";
import { useAuth } from "../hooks/useAuth";
import { CategoryFormDialog } from "../components/admin/CategoryFormDialog";
import { ProductFormDialog } from "../components/admin/ProductFormDialog";
import { Button } from "../components/ui/button";
import { Edit2, Trash2, Plus, IceCream, Coffee, Utensils, Star, Tag, ShoppingBag, Zap, User as UserIcon } from "lucide-react";

export default function Storefront() {
  const { isAdmin, user } = useAuth();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
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
            placeholder="Buscar por açaí, sorvetes..." 
            className="w-full bg-muted border-2 border-border rounded-none px-6 py-2.5 outline-none focus:border-secondary transition-colors font-mono text-sm placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex items-center gap-4">
          <Link href="/pedidos" className="text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors hidden md:flex items-center gap-2 border-2 border-border px-3 py-2 hover:bg-white/5">
            <ShoppingBag className="w-4 h-4" />
            Meus Pedidos
          </Link>
          
          {user ? (
            <Link href="/conta" className="flex items-center gap-2 border-2 border-primary bg-primary/10 text-primary px-3 py-2 hover:bg-primary hover:text-primary-foreground transition-colors font-mono text-xs uppercase tracking-widest">
              <UserIcon className="w-4 h-4" />
              Minha Conta
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
        
        {/* Banners Carousel */}
        <section className="mb-8">
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 no-scrollbar">
            <div className="snap-center shrink-0 w-[85%] md:w-[60%] h-40 bg-gradient-to-r from-primary/80 to-purple-800 rounded-none border-2 border-border flex items-center p-6 relative overflow-hidden">
              <div className="z-10">
                <span className="bg-background text-foreground text-[10px] font-mono uppercase px-2 py-1 tracking-widest mb-2 inline-block">Promo</span>
                <h3 className="font-heading text-2xl font-bold uppercase tracking-tight text-white leading-none mb-2">Combo Galáctico</h3>
                <p className="text-sm text-white/80 font-sans max-w-[200px]">Açaí 700ml + Cupuaçu com 20% OFF!</p>
              </div>
              <div className="absolute -right-10 -bottom-10 opacity-30 pointer-events-none">
                <Star className="w-48 h-48 text-white" />
              </div>
            </div>
            
            <div className="snap-center shrink-0 w-[85%] md:w-[60%] h-40 bg-gradient-to-r from-secondary/80 to-teal-800 rounded-none border-2 border-border flex items-center p-6 relative overflow-hidden">
              <div className="z-10">
                <span className="bg-background text-foreground text-[10px] font-mono uppercase px-2 py-1 tracking-widest mb-2 inline-block">Frete Grátis</span>
                <h3 className="font-heading text-2xl font-bold uppercase tracking-tight text-white leading-none mb-2">Pop Shakes</h3>
                <p className="text-sm text-white/80 font-sans max-w-[200px]">Peça agora e não pague a entrega.</p>
              </div>
              <div className="absolute -right-10 -bottom-10 opacity-30 pointer-events-none">
                <Tag className="w-48 h-48 text-white" />
              </div>
            </div>
          </div>
        </section>

        {/* Categories Bar */}
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
                <span className="text-[10px] font-mono uppercase">Add Cat</span>
              </Button>
            )}
          </div>
        </section>

        {/* Product Shelves */}
        <div className="space-y-12">
          {categories.map((cat) => {
            const catProducts = products.filter(p => p.category_id === cat.id || p.category === cat.name);
            if (catProducts.length === 0 && !isAdmin) return null;
            
            return (
              <section key={cat.id} id={`category-${cat.id}`} className="scroll-mt-32">
                <h2 className="font-heading text-2xl font-bold uppercase tracking-tight text-foreground mb-6 flex items-center gap-2">
                  {cat.name}
                  <span className="h-0.5 flex-1 bg-border ml-4"></span>
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {catProducts.map((product) => (
                    <div key={product.id} className="group relative bg-card border-2 border-border hover:border-secondary transition-colors flex overflow-hidden h-32">
                      
                      {isAdmin && (
                        <div className="absolute top-2 right-2 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-background border-2 border-border">
                          <button onClick={() => { setEditingProduct(product); setProdDialogOpen(true); }} className="p-1.5 hover:bg-muted text-primary transition-colors"><Edit2 className="w-3 h-3" /></button>
                          <button onClick={() => handleDeleteProduct(product.id)} className="p-1.5 hover:bg-muted text-destructive transition-colors"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      )}

                      <div className="w-32 shrink-0 bg-muted border-r-2 border-border relative overflow-hidden">
                        {product.imageUrl ? (
                           /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={product.imageUrl} alt={product.name} className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-mono text-muted-foreground">NO IMG</div>
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
                      
                      <button className="w-12 border-l-2 border-border bg-background hover:bg-secondary hover:text-background flex flex-col items-center justify-center text-secondary transition-colors group/btn shrink-0">
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
      <div className="fixed bottom-0 left-0 w-full md:hidden bg-background border-t-2 border-border p-4 z-40">
        <Button className="w-full h-12 bg-primary hover:bg-primary/90 rounded-none font-heading text-lg uppercase tracking-wider text-background">
          <ShoppingBag className="w-5 h-5 mr-2" />
          Ver Carrinho
        </Button>
      </div>

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
