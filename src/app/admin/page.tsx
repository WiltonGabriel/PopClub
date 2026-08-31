"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutDashboard, PackageSearch, Activity, DollarSign, Info, ChevronRight, LogOut, ArrowRight, Loader2, Store } from "lucide-react";
import { orderService, Order, OrderStatus } from "../../services/orderService";
import { authService } from "../../services/authService";
import { useRouter } from "next/navigation";
import { Button } from "../../components/ui/button";

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [fetching, setFetching] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setFetching(true);
    try {
      const data = await orderService.getAllOrders();
      setOrders(data);
    } catch (error) {
      console.error(error);
    } finally {
      setFetching(false);
    }
  };

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

  const handleSignOut = async () => {
    await authService.signOut();
    router.push("/");
  };

  // Metrics calculation
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
                <p className="text-xs font-sans text-foreground mb-3 line-clamp-2">
                  {order.items?.map(i => `${i.quantity}x ${i.product?.name}`).join(", ")}
                </p>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-border/50">
                  <span className="text-xs font-mono font-bold">R$ {order.total_amount}</span>
                  {order.status !== 'completed' && order.status !== 'cancelled' && (
                    <button 
                      onClick={() => handleUpdateStatus(order.id, order.status)}
                      className="text-[10px] font-mono uppercase bg-secondary/10 text-secondary hover:bg-secondary hover:text-background px-2 py-1 transition-colors flex items-center gap-1"
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
    <div className="min-h-screen flex flex-col font-sans">
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
            <h4 className="font-heading font-bold uppercase tracking-wide text-primary">Gestão de Produtos e Categorias</h4>
            <p className="text-sm font-sans text-muted-foreground mt-1">
              Para proporcionar a melhor experiência, a gestão de cardápio (adicionar, editar ou remover produtos e categorias) foi migrada para <strong>Edição Rápida na Vitrine (In-Page Editing)</strong>.
            </p>
            <Link href="/" className="inline-flex items-center gap-1 mt-3 text-xs font-mono uppercase text-primary hover:underline font-bold">
              Ir para Vitrine para editar cardápio <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Métricas Principais */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card border-2 border-border p-6 shadow-[4px_4px_0px_0px_rgba(5,217,232,0.15)] flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Faturamento Hoje</span>
              <DollarSign className="w-5 h-5 text-secondary" />
            </div>
            <span className="font-heading font-bold text-4xl text-foreground">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(revenueToday)}
            </span>
          </div>

          <div className="bg-card border-2 border-border p-6 shadow-[4px_4px_0px_0px_rgba(255,42,109,0.15)] flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Pedidos Hoje</span>
              <PackageSearch className="w-5 h-5 text-primary" />
            </div>
            <span className="font-heading font-bold text-4xl text-foreground">
              {todayOrders.length}
            </span>
          </div>

          <div className="bg-card border-2 border-border p-6 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] flex flex-col justify-between">
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
            {renderKanbanColumn("Novos", ['pending', 'accepted'], "#ff2a6d")}
            {renderKanbanColumn("Em Preparo", ['preparing'], "#facc15")}
            {renderKanbanColumn("A Caminho", ['ready', 'delivering'], "#05d9e8")}
            {renderKanbanColumn("Concluídos", ['completed'], "#4ade80")}
          </div>
        </section>

      </main>
    </div>
  );
}
