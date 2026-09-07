"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  PackageSearch,
  Activity,
  DollarSign,
  Info,
  ChevronRight,
  LogOut,
  ArrowRight,
  Loader2,
  Store,
  Tag,
  Plus,
  Edit2,
  Trash2,
} from "lucide-react";
import { orderService, Order, OrderStatus } from "../../services/orderService";
import { promotionService, Promotion } from "../../services/promotionService";
import { authService } from "../../services/authService";
import { useRouter } from "next/navigation";
import { Button } from "../../components/ui/button";
import { PromotionFormDialog } from "../../components/admin/PromotionFormDialog";

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [fetching, setFetching] = useState(true);
  const [promoDialogOpen, setPromoDialogOpen] = useState(false);
  const [promoToEdit, setPromoToEdit] = useState<Promotion | null>(null);

  const router = useRouter();

  const fetchOrders = async () => {
    try {
      const data = await orderService.getAllOrders();
      setOrders(data);
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
    }
  };

  const fetchPromos = useCallback(async () => {
    try {
      const data = await promotionService.getAllPromotions();
      setPromotions(data);
    } catch (error) {
      console.error("Erro ao buscar promoções:", error);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setFetching(true);
    await Promise.all([fetchOrders(), fetchPromos()]);
    setFetching(false);
  }, [fetchPromos]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleUpdateStatus = async (orderId: string, currentStatus: OrderStatus) => {
    const sequence: OrderStatus[] = ['pending', 'accepted', 'preparing', 'ready', 'delivering', 'completed'];
    const idx = sequence.indexOf(currentStatus);
    if (idx >= 0 && idx < sequence.length - 1) {
      const nextStatus = sequence[idx + 1];
      try {
        await orderService.updateOrderStatus(orderId, nextStatus);
        fetchOrders();
      } catch (err) {
        alert("Erro ao atualizar status do pedido");
      }
    }
  };

  const handleDeletePromo = async (id: string) => {
    if (confirm("Deseja realmente remover esta promoção?")) {
      try {
        await promotionService.deletePromotion(id);
        fetchPromos();
      } catch (err) {
        alert("Erro ao excluir promoção");
      }
    }
  };

  const handleSignOut = async () => {
    await authService.signOut();
    router.push("/");
  };

  // Métricas
  const today = new Date().toDateString();
  const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === today);
  const revenueToday = todayOrders.reduce((acc, o) => acc + Number(o.total_amount), 0);
  const activeOrdersCount = orders.filter(o => !['completed', 'cancelled'].includes(o.status)).length;

  if (fetching && orders.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderKanbanColumn = (title: string, statuses: OrderStatus[], color: string) => {
    const colOrders = orders.filter(o => statuses.includes(o.status));
    
    return (
      <div className={`bg-card border-t-4 border-l-2 border-r-2 border-b-2 border-border p-4 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.05)]`} style={{ borderTopColor: color }}>
        <h3 className="font-heading font-bold uppercase tracking-wider mb-4 flex justify-between">
          {title} 
          <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-xs font-mono">{colOrders.length}</span>
        </h3>
        <div className="space-y-4">
          {colOrders.length === 0 ? (
            <p className="text-muted-foreground text-xs font-mono py-4 text-center">Nenhum pedido</p>
          ) : (
            colOrders.map(order => (
              <div key={order.id} className="bg-background border border-border p-3">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold font-mono text-primary text-sm">#{order.id.substring(0,6)}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{new Date(order.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <p className="text-xs font-sans text-foreground mb-2 line-clamp-2">
                  {order.items?.map(i => `${i.quantity}x ${i.product?.name}`).join(", ")}
                </p>
                {order.delivery_address && (
                  <p className="text-[11px] font-mono text-muted-foreground mb-2">
                    {order.delivery_address.street}, {order.delivery_address.number} - {order.delivery_address.neighborhood}
                  </p>
                )}
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-border/50">
                  <span className="text-xs font-mono font-bold">R$ {order.total_amount?.toFixed(2)}</span>
                  {order.status !== 'completed' && order.status !== 'cancelled' && (
                    <button 
                      onClick={() => handleUpdateStatus(order.id, order.status)}
                      className="text-[10px] font-mono uppercase bg-secondary/10 text-secondary hover:bg-secondary hover:text-background px-2 py-1 transition-colors flex items-center gap-1 font-bold"
                    >
                      Avançar <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col font-sans pb-16">
      <header className="bg-card border-b border-border px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-heading font-black text-xl uppercase tracking-tighter">
            Pop<span className="text-primary">Admin</span>
          </Link>
          <span className="text-muted-foreground">|</span>
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Dashboard</span>
        </div>
        
        <div className="flex items-center gap-4">
          <Link href="/" className="hidden md:flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors border-2 border-border px-3 py-2">
            <Store className="w-4 h-4" /> Ver Vitrine
          </Link>
          <button onClick={handleSignOut} className="flex items-center gap-2 text-destructive hover:bg-destructive/10 px-3 py-2 text-xs font-mono uppercase tracking-widest transition-colors">
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-8">
        
        {/* Banner de Aviso: In-Page Editing */}
        <div className="bg-primary/10 border-l-4 border-primary p-4 flex items-start gap-4">
          <Info className="w-6 h-6 text-primary shrink-0 mt-0.5" />
          <div>
            <h4 className="font-heading font-bold uppercase tracking-wide text-primary">Gestão de Cardápio & Promoções</h4>
            <p className="text-sm font-sans text-muted-foreground mt-1">
              Produtos, categorias e promoções podem ser editados diretamente na vitrine ou gerenciados aqui no painel.
            </p>
            <Link href="/" className="inline-flex items-center gap-1 mt-3 text-xs font-mono uppercase text-primary hover:underline font-bold">
              Ir para Vitrine para edição contextual <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Métricas Principais */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card border-2 border-border p-6 shadow-[4px_4px_0px_0px_rgba(136,27,170,0.15)] flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Faturamento Hoje</span>
              <DollarSign className="w-5 h-5 text-secondary" />
            </div>
            <span className="font-heading font-bold text-4xl text-foreground">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(revenueToday)}
            </span>
          </div>

          <div className="bg-card border-2 border-border p-6 shadow-[4px_4px_0px_0px_rgba(147,6,207,0.15)] flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Pedidos Hoje</span>
              <PackageSearch className="w-5 h-5 text-primary" />
            </div>
            <span className="font-heading font-bold text-4xl text-foreground">
              {todayOrders.length}
            </span>
          </div>

          <div className="bg-card border-2 border-border p-6 shadow-[4px_4px_0px_0px_rgba(148,0,104,0.15)] flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Pedidos Ativos</span>
              <Activity className="w-5 h-5 text-blue-400" />
            </div>
            <span className="font-heading font-bold text-4xl text-foreground">
              {activeOrdersCount}
            </span>
          </div>
        </section>

        {/* Gestão de Pedidos: Kanban */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-heading text-2xl font-bold uppercase tracking-wide flex items-center gap-2">
              <LayoutDashboard className="w-6 h-6 text-primary" /> Gestão de Pedidos
            </h2>
            <Button onClick={fetchOrders} variant="outline" className="font-mono text-xs uppercase tracking-widest rounded-none border-2">
              Atualizar Board
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 overflow-x-auto pb-4">
            {renderKanbanColumn("Novos", ['pending', 'accepted'], "#9306CF")}
            {renderKanbanColumn("Em Preparo", ['preparing'], "#facc15")}
            {renderKanbanColumn("A Caminho", ['ready', 'delivering'], "#881BAA")}
            {renderKanbanColumn("Concluídos", ['completed'], "#35A340")}
          </div>
        </section>

        {/* Gestão de Promoções Dinâmicas */}
        <section className="bg-card border-2 border-border p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
            <div>
              <h2 className="font-heading text-xl font-bold uppercase tracking-wide flex items-center gap-2">
                <Tag className="w-5 h-5 text-primary" /> Gestão de Promoções Dinâmicas (PostgreSQL)
              </h2>
              <p className="text-xs font-sans text-muted-foreground mt-1">
                Cadastre e edite combos, banners e descontos exibidos na vitrine e na página dedicada de promoção.
              </p>
            </div>
            <Button
              onClick={() => {
                setPromoToEdit(null);
                setPromoDialogOpen(true);
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-mono text-xs uppercase tracking-widest rounded-none font-bold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Nova Promoção
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {promotions.map((promo) => (
              <div
                key={promo.id}
                className="bg-background border-2 border-border p-4 flex flex-col justify-between shadow-sm relative overflow-hidden"
              >
                <div
                  className="h-2 w-full absolute top-0 left-0"
                  style={{
                    background: `linear-gradient(to right, ${promo.gradientStart}, ${promo.gradientEnd})`,
                  }}
                />

                <div>
                  <div className="flex justify-between items-start mt-2 mb-2">
                    <span className="bg-muted text-foreground text-[10px] font-mono uppercase px-2 py-0.5 font-bold">
                      {promo.badge}
                    </span>
                    <span className="text-xs font-mono font-bold text-success">
                      {promo.discountType === "percentage" ? `${promo.discountValue}% OFF` : `R$ ${promo.discountValue.toFixed(2)} OFF`}
                    </span>
                  </div>

                  <h3 className="font-heading font-bold text-lg leading-snug">{promo.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1 font-sans">
                    {promo.description}
                  </p>

                  <div className="mt-3 text-[11px] font-mono text-muted-foreground">
                    Itens vinculados: <strong className="text-foreground">{promo.items?.length || 0} produto(s)</strong>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-4 pt-3 border-t border-border">
                  <Link
                    href={`/promo/${promo.id}`}
                    className="text-xs font-mono text-primary hover:underline flex items-center gap-1"
                  >
                    Ver Página <ChevronRight className="w-3.5 h-3.5" />
                  </Link>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setPromoToEdit(promo);
                        setPromoDialogOpen(true);
                      }}
                      className="p-1 text-primary hover:bg-muted"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePromo(promo.id)}
                      className="p-1 text-destructive hover:bg-muted"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* Modal Administrativo de Promoções */}
      <PromotionFormDialog
        open={promoDialogOpen}
        onOpenChange={setPromoDialogOpen}
        onSaved={fetchPromos}
        promoToEdit={promoToEdit}
      />
    </div>
  );
}
