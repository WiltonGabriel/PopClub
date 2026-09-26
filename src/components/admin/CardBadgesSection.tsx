"use client";

import { useState, useEffect, useMemo } from "react";
import { badgeService, CardBadge, BadgeProduct } from "../../services/badgeService";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Tag,
  Plus,
  Pencil,
  Trash2,
  Sparkles,
  Loader2,
  Eye,
  Palette,
  ChevronDown,
  ChevronUp,
  X,
  PackagePlus,
  Search,
} from "lucide-react";

const SUGGESTED_EMOJIS = ["⚡", "🔥", "✨", "❄️", "🍇", "🍦", "🥤", "🏷️", "⭐", "💥", "🍓", "🍫"];

const COLOR_PRESETS = [
  { name: "Amarelo / Âmbar", bg: "#FEF3C7", text: "#B45309" },
  { name: "Roxo / Púrpura", bg: "#F3E8FF", text: "#7E22CE" },
  { name: "Verde / Folha", bg: "#DCFCE7", text: "#15803D" },
  { name: "Azul / Gelo", bg: "#E0F2FE", text: "#0369A1" },
  { name: "Vermelho / Fogo", bg: "#FEE2E2", text: "#DC2626" },
  { name: "Laranja / Solar", bg: "#FFEDD5", text: "#C2410C" },
  { name: "Rosa / Doçura", bg: "#FCE7F3", text: "#BE185D" },
  { name: "Escuro / Noturno", bg: "#1F2937", text: "#F9FAFB" },
];

interface SimpleProduct {
  id: string;
  name: string;
  imageUrl?: string | null;
}

interface CardBadgesSectionProps {
  onBadgesUpdated?: () => void;
}

export function CardBadgesSection({ onBadgesUpdated }: CardBadgesSectionProps) {
  const [badges, setBadges] = useState<CardBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBadge, setEditingBadge] = useState<CardBadge | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Expanded badge cards for product management
  const [expandedBadgeId, setExpandedBadgeId] = useState<string | null>(null);
  const [allProducts, setAllProducts] = useState<SimpleProduct[]>([]);
  const [productSearch, setProductSearch] = useState<Record<string, string>>({});
  const [linkingBadgeId, setLinkingBadgeId] = useState<string | null>(null);
  const [unlinkingProductId, setUnlinkingProductId] = useState<string | null>(null);

  // Form fields
  const [text, setText] = useState("");
  const [icon, setIcon] = useState("⚡");
  const [bgColor, setBgColor] = useState("#FEF3C7");
  const [textColor, setTextColor] = useState("#B45309");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadBadges = async () => {
    try {
      setLoading(true);
      const data = await badgeService.getBadges();
      setBadges(data);
    } catch (err: any) {
      console.error("Erro ao carregar selos:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadAllProducts = async () => {
    try {
      const res = await fetch("/api/products", { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const data = await res.json();
        setAllProducts(
          (data || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            imageUrl: p.imageUrl ?? p.image_url ?? null,
          }))
        );
      }
    } catch {
      /* silent */
    }
  };

  useEffect(() => {
    loadBadges();
    loadAllProducts();
  }, []);

  const openNewForm = () => {
    setEditingBadge(null);
    setText("");
    setIcon("⚡");
    setBgColor("#FEF3C7");
    setTextColor("#B45309");
    setError("");
    setIsFormOpen(true);
  };

  const openEditForm = (b: CardBadge) => {
    setEditingBadge(b);
    setText(b.text);
    setIcon(b.icon || "");
    setBgColor(b.bgColor || "#FEF3C7");
    setTextColor(b.textColor || "#B45309");
    setError("");
    setIsFormOpen(true);
  };

  const handleApplyPreset = (preset: { bg: string; text: string }) => {
    setBgColor(preset.bg);
    setTextColor(preset.text);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setError("Por favor, informe o texto do selo.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (editingBadge) {
        await badgeService.updateBadge(editingBadge.id, {
          text: text.trim(),
          icon: icon.trim() || undefined,
          bgColor,
          textColor,
        });
      } else {
        await badgeService.createBadge({
          text: text.trim(),
          icon: icon.trim() || undefined,
          bgColor,
          textColor,
        });
      }

      await loadBadges();
      setIsFormOpen(false);
      onBadgesUpdated?.();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar selo.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir o selo "${name}"? Os produtos vinculados a ele ficarão sem selo.`)) {
      try {
        await badgeService.deleteBadge(id);
        await loadBadges();
        onBadgesUpdated?.();
      } catch (err: any) {
        alert(err.message || "Erro ao excluir selo.");
      }
    }
  };

  const handleRemoveProduct = async (badgeId: string, productId: string) => {
    setUnlinkingProductId(productId);
    try {
      const updated = await badgeService.removeProduct(badgeId, productId);
      setBadges((prev) => prev.map((b) => (b.id === badgeId ? updated : b)));
      onBadgesUpdated?.();
    } catch (err: any) {
      alert(err.message || "Erro ao desvincular produto.");
    } finally {
      setUnlinkingProductId(null);
    }
  };

  const handleAddProduct = async (badgeId: string, productId: string) => {
    setLinkingBadgeId(badgeId);
    try {
      const updated = await badgeService.addProduct(badgeId, productId);
      setBadges((prev) => prev.map((b) => (b.id === badgeId ? updated : b)));
      setProductSearch((prev) => ({ ...prev, [badgeId]: "" }));
      onBadgesUpdated?.();
    } catch (err: any) {
      alert(err.message || "Erro ao vincular produto.");
    } finally {
      setLinkingBadgeId(null);
    }
  };

  // Filtrar produtos disponíveis para vínculo (não vinculados ainda a este badge)
  const getAvailableProducts = (badge: CardBadge, search: string) => {
    const linkedIds = new Set((badge.products || []).map((p) => p.id));
    return allProducts
      .filter((p) => !linkedIds.has(p.id))
      .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 8);
  };

  return (
    <div className="space-y-6 pt-4 border-t border-gray-100 dark:border-border/30">
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-heading text-lg sm:text-xl font-bold uppercase tracking-wide flex items-center gap-2 text-foreground dark:text-foreground">
            <Tag className="w-5 h-5 text-primary" />
            Selos dos Cards (Badges Flutuantes)
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Crie etiquetas visuais personalizadas (ex: &ldquo;⚡ Combo&rdquo;, &ldquo;🔥 Mais Pedido&rdquo;) exibidas no canto superior das fotos dos produtos.
          </p>
        </div>

        <Button
          onClick={openNewForm}
          className="bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white font-heading text-xs uppercase tracking-wider rounded-xl font-bold flex items-center gap-2 h-10 px-4 shadow-md shadow-primary/20 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Novo Selo
        </Button>
      </div>

      {/* Formulário de Criação / Edição (Inline Expansível) */}
      {isFormOpen && (
        <div className="p-5 sm:p-6 rounded-2xl bg-gray-50/90 dark:bg-[#1C0B1E] border border-primary/30 shadow-md animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-200 dark:border-border/40">
            <h4 className="font-heading font-bold text-sm sm:text-base text-foreground dark:text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              {editingBadge ? "Editar Selo Flutuante" : "Cadastrar Novo Selo Flutuante"}
            </h4>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Cancelar
            </button>
          </div>

          <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Campos de Entrada */}
            <div className="lg:col-span-7 space-y-4">
              {/* Texto do Selo */}
              <div className="space-y-1.5">
                <Label htmlFor="badge-text" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Texto do Selo
                </Label>
                <Input
                  id="badge-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Ex: Combo, Mais Pedido, Lançamento, 20% OFF..."
                  required
                  className="h-10 rounded-xl bg-white dark:bg-card border-gray-200 dark:border-border/50"
                />
              </div>

              {/* Ícone / Emoji */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Ícone / Emoji Opcional
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    placeholder="⚡"
                    className="w-16 h-10 text-center text-lg rounded-xl bg-white dark:bg-card border-gray-200 dark:border-border/50"
                    maxLength={4}
                  />
                  <div className="flex flex-wrap gap-1">
                    {SUGGESTED_EMOJIS.map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setIcon(em)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all cursor-pointer ${
                          icon === em
                            ? "bg-primary text-white scale-110 shadow-xs"
                            : "bg-white dark:bg-card hover:bg-gray-100 dark:hover:bg-white/10 text-foreground border border-gray-200 dark:border-border/30"
                        }`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Cores Personalizadas */}
              <div className="space-y-3 pt-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-primary" />
                  Paleta de Cores do Selo
                </Label>

                {/* Presets Rápidos */}
                <div className="flex flex-wrap gap-1.5">
                  {COLOR_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      style={{ backgroundColor: p.bg, color: p.text }}
                      className="px-2.5 py-1 rounded-full text-xs font-semibold border border-black/10 shadow-2xs hover:scale-105 transition-transform cursor-pointer"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Cor de Fundo */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground">Cor de Fundo:</span>
                    <div className="flex items-center gap-2 bg-white dark:bg-card p-1.5 rounded-xl border border-gray-200 dark:border-border/50">
                      <input
                        type="color"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                      />
                      <Input
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="h-8 text-xs font-mono rounded-lg border-0 bg-transparent uppercase"
                      />
                    </div>
                  </div>

                  {/* Cor do Texto e Ícone */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground">Cor do Texto e Ícone:</span>
                    <div className="flex items-center gap-2 bg-white dark:bg-card p-1.5 rounded-xl border border-gray-200 dark:border-border/50">
                      <input
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                      />
                      <Input
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="h-8 text-xs font-mono rounded-lg border-0 bg-transparent uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 p-2.5 rounded-xl border border-red-200 dark:border-red-900/40">
                  {error}
                </p>
              )}

              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white font-heading font-bold text-xs uppercase tracking-wider rounded-xl h-10 px-5 shadow-sm cursor-pointer"
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...
                    </span>
                  ) : editingBadge ? (
                    "Atualizar Selo"
                  ) : (
                    "Salvar Selo"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFormOpen(false)}
                  className="rounded-xl h-10 text-xs cursor-pointer"
                >
                  Cancelar
                </Button>
              </div>
            </div>

            {/* Coluna Direita: Pré-visualização Real no Card */}
            <div className="lg:col-span-5 flex flex-col justify-center">
              <div className="space-y-2 p-4 rounded-2xl bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 shadow-xs">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground pb-1 border-b border-gray-100 dark:border-white/5">
                  <Eye className="w-3.5 h-3.5 text-primary" />
                  Preview Real do Selo no Card
                </div>

                {/* Card Simulado */}
                <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-gradient-to-br from-primary/90/20 to-primary/95/40 border border-gray-200 dark:border-border/40 flex items-center justify-center shadow-inner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=600&auto=format&fit=crop&q=80"
                    alt="Demonstração do Selo"
                    className="w-full h-full object-cover opacity-85"
                  />

                  {/* O Selo Renderizado exatamente como na vitrine */}
                  <span
                    style={{
                      backgroundColor: bgColor,
                      color: textColor,
                    }}
                    className="absolute top-2 right-2 rounded-full px-2.5 py-0.5 text-xs font-semibold flex items-center gap-1 shadow-sm select-none z-10 transition-all duration-150"
                  >
                    {icon && <span>{icon}</span>}
                    <span>{text || "Exemplo de Selo"}</span>
                  </span>

                  <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-xs text-white text-[11px] font-bold">
                    Açaí 500ml
                  </div>
                </div>

                <p className="text-[11px] text-gray-400 text-center">
                  O selo aparecerá automaticamente no canto superior direito do produto.
                </p>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Selos Cadastrados */}
      {loading ? (
        <div className="flex items-center justify-center p-8 text-gray-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-xs font-medium">Carregando selos...</span>
        </div>
      ) : badges.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-gray-200 dark:border-border/40 rounded-2xl space-y-2 bg-gray-50/50 dark:bg-background/40">
          <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
            Nenhum selo cadastrado.
          </p>
          <p className="text-[11px] text-gray-400">
            Clique em &ldquo;Novo Selo&rdquo; para criar etiquetas visuais como &ldquo;⚡ Combo&rdquo; ou &ldquo;🔥 Mais Pedido&rdquo;.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {badges.map((b) => {
            const isExpanded = expandedBadgeId === b.id;
            const search = productSearch[b.id] || "";
            const available = getAvailableProducts(b, search);
            const productCount = b._count?.products ?? (b.products?.length ?? 0);

            return (
              <div
                key={b.id}
                className="rounded-2xl bg-gray-50/80 dark:bg-background border border-gray-200 dark:border-border/40 hover:border-primary/40 transition-all flex flex-col shadow-xs overflow-hidden"
              >
                {/* Cabeçalho do Card */}
                <div className="p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    {/* Visualização Real do Selo */}
                    <span
                      style={{ backgroundColor: b.bgColor, color: b.textColor }}
                      className="rounded-full px-2.5 py-0.5 text-xs font-semibold flex items-center gap-1 shadow-xs"
                    >
                      {b.icon && <span>{b.icon}</span>}
                      <span>{b.text}</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => setExpandedBadgeId(isExpanded ? null : b.id)}
                      className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer px-1.5 py-0.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"
                      title={isExpanded ? "Recolher produtos" : "Gerenciar produtos"}
                    >
                      <span>{productCount} produto(s)</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-gray-200/60 dark:border-white/5">
                    <div className="flex items-center gap-1 text-[10px] font-mono text-gray-400">
                      <span className="w-2.5 h-2.5 rounded-full border border-black/10 inline-block" style={{ backgroundColor: b.bgColor }} />
                      <span>{b.bgColor}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditForm(b)}
                        className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                        title="Editar Selo"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(b.id, b.text)}
                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                        title="Excluir Selo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Painel Expansível de Produtos */}
                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-border/40 bg-white/60 dark:bg-black/10 p-3 space-y-3 animate-in fade-in duration-150">
                    {/* Produtos vinculados */}
                    {(b.products || []).length === 0 ? (
                      <p className="text-[11px] text-muted-foreground text-center py-1">
                        Nenhum produto vinculado a este selo.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {(b.products || []).map((prod) => (
                          <span
                            key={prod.id}
                            className="inline-flex items-center gap-1 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-full px-2.5 py-0.5 text-[11px] font-medium text-gray-700 dark:text-gray-300"
                          >
                            <span className="max-w-[100px] truncate">{prod.name}</span>
                            <button
                              type="button"
                              disabled={unlinkingProductId === prod.id}
                              onClick={() => handleRemoveProduct(b.id, prod.id)}
                              className="w-3.5 h-3.5 rounded-full flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors cursor-pointer shrink-0 disabled:opacity-40"
                              title={`Desvincular "${prod.name}"`}
                            >
                              {unlinkingProductId === prod.id ? (
                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              ) : (
                                <X className="w-2.5 h-2.5" />
                              )}
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Busca e vínculo de novos produtos */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <PackagePlus className="w-3 h-3 text-primary" />
                        Vincular Produto
                      </label>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                        <input
                          type="text"
                          value={search}
                          onChange={(e) => setProductSearch((prev) => ({ ...prev, [b.id]: e.target.value }))}
                          placeholder="Buscar produto..."
                          className="w-full h-8 pl-7 pr-3 text-xs rounded-lg border border-gray-200 dark:border-border/40 bg-white dark:bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                        />
                      </div>
                      {search && available.length === 0 && (
                        <p className="text-[11px] text-muted-foreground text-center py-1">
                          Nenhum produto disponível.
                        </p>
                      )}
                      {available.length > 0 && (
                        <div className="max-h-36 overflow-y-auto rounded-lg border border-gray-200 dark:border-border/30 bg-white dark:bg-[#1C0B1E] divide-y divide-gray-100 dark:divide-white/5">
                          {available.map((prod) => (
                            <button
                              key={prod.id}
                              type="button"
                              disabled={linkingBadgeId === b.id}
                              onClick={() => handleAddProduct(b.id, prod.id)}
                              className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 hover:bg-primary/5 transition-colors text-xs text-foreground cursor-pointer disabled:opacity-50"
                            >
                              {linkingBadgeId === b.id ? (
                                <Loader2 className="w-3 h-3 animate-spin shrink-0 text-primary" />
                              ) : (
                                <Plus className="w-3 h-3 shrink-0 text-primary" />
                              )}
                              <span className="truncate">{prod.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
