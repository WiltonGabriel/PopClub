"use client";

import { useState, useEffect } from "react";
import { badgeService, CardBadge } from "../../services/badgeService";
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
  Check,
  Palette,
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

interface CardBadgesSectionProps {
  onBadgesUpdated?: () => void;
}

export function CardBadgesSection({ onBadgesUpdated }: CardBadgesSectionProps) {
  const [badges, setBadges] = useState<CardBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBadge, setEditingBadge] = useState<CardBadge | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Campos do formulário
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

  useEffect(() => {
    loadBadges();
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

  return (
    <div className="space-y-6 pt-4 border-t border-gray-100 dark:border-[#512B54]/30">
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-heading text-lg sm:text-xl font-bold uppercase tracking-wide flex items-center gap-2 text-[#4C264F] dark:text-[#F9F5F9]">
            <Tag className="w-5 h-5 text-[#9306CF]" />
            Selos dos Cards (Badges Flutuantes)
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Crie etiquetas visuais personalizadas (ex: &ldquo;⚡ Combo&rdquo;, &ldquo;🔥 Mais Pedido&rdquo;) exibidas no canto superior das fotos dos produtos.
          </p>
        </div>

        <Button
          onClick={openNewForm}
          className="bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-95 text-white font-heading text-xs uppercase tracking-wider rounded-xl font-bold flex items-center gap-2 h-10 px-4 shadow-md shadow-[#9306CF]/20 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Novo Selo
        </Button>
      </div>

      {/* Formulário de Criação / Edição (Inline Expansível) */}
      {isFormOpen && (
        <div className="p-5 sm:p-6 rounded-2xl bg-gray-50/90 dark:bg-[#1C0B1E] border border-[#9306CF]/30 shadow-md animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-200 dark:border-[#512B54]/40">
            <h4 className="font-heading font-bold text-sm sm:text-base text-[#4C264F] dark:text-[#F9F5F9] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#9306CF]" />
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
                  className="h-10 rounded-xl bg-white dark:bg-[#2B132D] border-gray-200 dark:border-[#512B54]/50"
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
                    className="w-16 h-10 text-center text-lg rounded-xl bg-white dark:bg-[#2B132D] border-gray-200 dark:border-[#512B54]/50"
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
                            ? "bg-[#9306CF] text-white scale-110 shadow-xs"
                            : "bg-white dark:bg-[#2B132D] hover:bg-gray-100 dark:hover:bg-white/10 text-foreground border border-gray-200 dark:border-[#512B54]/30"
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
                  <Palette className="w-3.5 h-3.5 text-[#9306CF]" />
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
                    <div className="flex items-center gap-2 bg-white dark:bg-[#2B132D] p-1.5 rounded-xl border border-gray-200 dark:border-[#512B54]/50">
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
                    <div className="flex items-center gap-2 bg-white dark:bg-[#2B132D] p-1.5 rounded-xl border border-gray-200 dark:border-[#512B54]/50">
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
                  className="bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-95 text-white font-heading font-bold text-xs uppercase tracking-wider rounded-xl h-10 px-5 shadow-sm cursor-pointer"
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
              <div className="space-y-2 p-4 rounded-2xl bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40 shadow-xs">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground pb-1 border-b border-gray-100 dark:border-white/5">
                  <Eye className="w-3.5 h-3.5 text-[#9306CF]" />
                  Preview Real do Selo no Card
                </div>

                {/* Card Simulado */}
                <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-gradient-to-br from-purple-900/20 to-purple-950/40 border border-gray-200 dark:border-[#512B54]/40 flex items-center justify-center shadow-inner">
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
          <Loader2 className="w-5 h-5 animate-spin text-[#9306CF]" />
          <span className="text-xs font-medium">Carregando selos...</span>
        </div>
      ) : badges.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-gray-200 dark:border-[#512B54]/40 rounded-2xl space-y-2 bg-gray-50/50 dark:bg-[#190B1A]/40">
          <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
            Nenhum selo cadastrado.
          </p>
          <p className="text-[11px] text-gray-400">
            Clique em &ldquo;Novo Selo&rdquo; para criar etiquetas visuais como &ldquo;⚡ Combo&rdquo; ou &ldquo;🔥 Mais Pedido&rdquo;.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {badges.map((b) => (
            <div
              key={b.id}
              className="p-4 rounded-2xl bg-gray-50/80 dark:bg-[#1A0B1C] border border-gray-200 dark:border-[#512B54]/40 hover:border-[#9306CF]/40 transition-all flex flex-col justify-between gap-3 shadow-xs"
            >
              <div className="flex items-center justify-between">
                {/* Visualização Real do Selo */}
                <span
                  style={{
                    backgroundColor: b.bgColor,
                    color: b.textColor,
                  }}
                  className="rounded-full px-2.5 py-0.5 text-xs font-semibold flex items-center gap-1 shadow-xs"
                >
                  {b.icon && <span>{b.icon}</span>}
                  <span>{b.text}</span>
                </span>

                <span className="text-[11px] font-mono text-muted-foreground">
                  {b._count?.products ? `${b._count.products} produto(s)` : "0 produtos"}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-200/60 dark:border-white/5">
                <div className="flex items-center gap-1 text-[10px] font-mono text-gray-400">
                  <span className="w-2.5 h-2.5 rounded-full border border-black/10 inline-block" style={{ backgroundColor: b.bgColor }} />
                  <span>{b.bgColor}</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditForm(b)}
                    className="p-1.5 text-[#9306CF] hover:bg-[#9306CF]/10 rounded-lg transition-colors cursor-pointer"
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
          ))}
        </div>
      )}
    </div>
  );
}
