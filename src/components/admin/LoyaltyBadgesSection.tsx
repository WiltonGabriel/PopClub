"use client";

import { useEffect, useState } from "react";
import { 
  Award, 
  Plus, 
  Pencil, 
  Trash2, 
  RotateCcw, 
  Save, 
  Loader2, 
  Check, 
  X,
  Sparkles,
  Clock,
  HelpCircle
} from "lucide-react";
import { 
  LoyaltyBadgeConfig, 
  DEFAULT_LOYALTY_BADGES, 
  loyaltyBadgeService 
} from "@/services/loyaltyBadgeService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/ToastNotification";

const SUGGESTED_EMOJIS = ["🌟", "🥉", "🥈", "🥇", "💎", "👑", "🏆", "🔥", "⚡", "✨", "🍧", "🥣"];

export function LoyaltyBadgesSection() {
  const { showToast } = useToast();
  const [badges, setBadges] = useState<LoyaltyBadgeConfig[]>(DEFAULT_LOYALTY_BADGES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal de edição / criação
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBadge, setEditingBadge] = useState<LoyaltyBadgeConfig | null>(null);
  const [formName, setFormName] = useState("");
  const [formIcon, setFormIcon] = useState("🌟");
  const [formMonths, setFormMonths] = useState(0);

  useEffect(() => {
    loadBadges();
  }, []);

  const loadBadges = async () => {
    setLoading(true);
    try {
      const data = await loyaltyBadgeService.getBadges();
      setBadges(data);
    } catch {
      setBadges(DEFAULT_LOYALTY_BADGES);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    if (badges.length >= 6) {
      showToast({
        type: "error",
        title: "Limite Atingido",
        message: "O sistema suporta no máximo 6 níveis de selos de fidelidade.",
      });
      return;
    }

    const nextMonths = badges.length > 0 ? (badges[badges.length - 1].minMonths || 0) + 6 : 0;
    const nextEmoji = SUGGESTED_EMOJIS[badges.length] || "💎";

    setEditingBadge(null);
    setFormName(`Nível VIP ${badges.length + 1}`);
    setFormIcon(nextEmoji);
    setFormMonths(nextMonths);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (badge: LoyaltyBadgeConfig) => {
    setEditingBadge(badge);
    setFormName(badge.name);
    setFormIcon(badge.icon);
    setFormMonths(badge.minMonths);
    setIsModalOpen(true);
  };

  const handleSaveBadgeModal = () => {
    const trimmedName = formName.trim();
    if (!trimmedName) {
      showToast({
        type: "error",
        title: "Nome Obrigatório",
        message: "Por favor, digite o nome do selo.",
      });
      return;
    }

    const trimmedIcon = formIcon.trim() || "🌟";
    const numMonths = Math.max(0, parseInt(String(formMonths), 10) || 0);

    if (editingBadge) {
      // Atualizar existente
      setBadges((prev) =>
        prev.map((b) =>
          b.id === editingBadge.id
            ? { ...b, name: trimmedName, icon: trimmedIcon, minMonths: numMonths }
            : b
        )
      );
    } else {
      // Criar novo
      const newBadge: LoyaltyBadgeConfig = {
        id: `badge_${Date.now()}`,
        name: trimmedName,
        icon: trimmedIcon,
        minMonths: numMonths,
      };
      setBadges((prev) => [...prev, newBadge]);
    }

    setIsModalOpen(false);
    showToast({
      type: "success",
      title: editingBadge ? "Selo Atualizado" : "Selo Adicionado",
      message: "Clique em 'Salvar Configuração' para gravar as alterações no banco.",
    });
  };

  const handleDeleteBadge = (badgeId: string) => {
    if (badges.length <= 1) {
      showToast({
        type: "error",
        title: "Ação não permitida",
        message: "É necessário manter pelo menos 1 nível de selo cadastrado.",
      });
      return;
    }

    if (!confirm("Deseja realmente remover este nível de selo?")) return;

    setBadges((prev) => prev.filter((b) => b.id !== badgeId));
    showToast({
      type: "success",
      title: "Selo Removido",
      message: "Clique em 'Salvar Configuração' para confirmar.",
    });
  };

  const handleResetDefaults = () => {
    if (!confirm("Deseja restaurar os 4 selos de fidelidade originais da Pop Shake?")) return;
    setBadges(DEFAULT_LOYALTY_BADGES);
    showToast({
      type: "info",
      title: "Padrão Restaurado",
      message: "Lembre-se de clicar em 'Salvar Configuração' para aplicar.",
    });
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const updated = await loyaltyBadgeService.updateBadges(badges);
      setBadges(updated);
      showToast({
        type: "success",
        title: "Selos de Fidelidade Salvos",
        message: "A régua de selos foi atualizada e já está refletindo no perfil dos clientes.",
      });
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Erro ao Salvar",
        message: err.message || "Não foi possível gravar as alterações.",
      });
    } finally {
      setSaving(false);
    }
  };

  const sortedBadges = [...badges].sort((a, b) => a.minMonths - b.minMonths);

  return (
    <div className="space-y-6 pt-6 border-t border-gray-100 dark:border-zinc-800">
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h3 className="font-heading text-lg sm:text-xl font-bold uppercase tracking-wide flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
            <Award className="w-5 h-5 text-primary dark:text-violet-400" />
            Selos de Fidelidade (Perfil do Cliente)
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl leading-relaxed">
            Configure a régua progressiva de até 6 níveis de selos exibidos no cabeçalho do perfil do cliente, calculados com base no tempo de cadastro da conta.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetDefaults}
            className="h-9 px-3 rounded-xl border-gray-200 dark:border-zinc-700 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer"
            title="Restaurar os 4 selos de fidelidade padrão"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Padrão
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleOpenAdd}
            disabled={badges.length >= 6}
            className="h-9 px-3 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Novo Selo ({badges.length}/6)
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSaveAll}
            disabled={saving}
            className="h-9 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-sm cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 mr-1.5" />
                Salvar Configuração
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Grid de Selos Atuais */}
      {loading ? (
        <div className="p-10 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedBadges.map((badge, idx) => {
            const tenureLabel =
              badge.minMonths === 0
                ? "Desde o 1º dia (0 meses)"
                : badge.minMonths === 1
                ? "A partir de 1 mês"
                : badge.minMonths < 12
                ? `A partir de ${badge.minMonths} meses`
                : badge.minMonths === 12
                ? "A partir de 1 ano (12 meses)"
                : `A partir de ${Math.floor(badge.minMonths / 12)} anos (${badge.minMonths} meses)`;

            return (
              <div
                key={badge.id || idx}
                className="bg-white dark:bg-[#181D2D] border border-gray-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs relative flex flex-col justify-between group hover:border-primary/50 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-border/50 flex items-center justify-center text-2xl shadow-2xs">
                      {badge.icon}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(badge)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                        title="Editar Selo"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBadge(badge.id)}
                        disabled={badges.length <= 1}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer disabled:opacity-30"
                        title="Excluir Selo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Nível {idx + 1}
                    </span>
                    <h4 className="font-heading font-bold text-base text-zinc-900 dark:text-zinc-100">
                      {badge.name}
                    </h4>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                      <span>{tenureLabel}</span>
                    </p>
                  </div>
                </div>

                {/* Prévia da Pílula exatamente como no Perfil */}
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-zinc-800/80 flex items-center justify-between">
                  <span className="text-[10px] font-medium text-muted-foreground">Prévia no Perfil:</span>
                  <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      badge.badgeClass || "bg-primary/10 text-primary border-primary/30"
                    }`}
                  >
                    <span>{badge.icon}</span>
                    <span>{badge.name}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Criação / Edição de Selo */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-[#181D2D] border border-gray-200 dark:border-zinc-800 rounded-3xl shadow-xl p-6 space-y-5 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3">
              <h4 className="font-heading font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                {editingBadge ? "Editar Nível de Selo" : "Novo Nível de Selo"}
              </h4>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Nome do Selo */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Nome do Selo (ex: Novo Membro, Cliente Ouro VIP)
                </Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Cliente Diamante"
                  className="rounded-xl h-10 border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80"
                  maxLength={40}
                />
              </div>

              {/* Ícone / Emoji */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Emoji / Ícone do Selo
                </Label>
                <div className="flex items-center gap-2">
                  <div className="w-12 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xl shrink-0 border border-border/50">
                    {formIcon || "🌟"}
                  </div>
                  <Input
                    value={formIcon}
                    onChange={(e) => setFormIcon(e.target.value)}
                    placeholder="Cole um emoji como 👑 ou 💎"
                    className="rounded-xl h-10 border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80"
                    maxLength={10}
                  />
                </div>

                {/* Sugestões rápidas de emojis */}
                <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
                  <span className="text-[10px] text-muted-foreground shrink-0">Sugestões:</span>
                  {SUGGESTED_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setFormIcon(emoji)}
                      className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center border transition-all cursor-pointer ${
                        formIcon === emoji
                          ? "border-primary bg-primary/10 scale-105"
                          : "border-border/60 hover:bg-muted"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tempo Mínimo de Conta */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Tempo Mínimo de Conta (em Meses)
                  </Label>
                  <span className="text-[11px] font-bold text-primary dark:text-violet-400">
                    {formMonths === 0 ? "Imediato (0 meses)" : formMonths === 1 ? "1 mês" : `${formMonths} meses`}
                  </span>
                </div>
                <Input
                  type="number"
                  min={0}
                  max={120}
                  value={formMonths}
                  onChange={(e) => setFormMonths(parseInt(e.target.value, 10) || 0)}
                  placeholder="0"
                  className="rounded-xl h-10 border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80"
                />
                <p className="text-[11px] text-muted-foreground">
                  O cliente receberá este selo automaticamente ao completar este número de meses desde o cadastro.
                </p>
              </div>

              {/* Prévia Instantânea */}
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-border/60 flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Visualização prévia:</span>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-primary/10 text-primary dark:text-violet-300 border-primary/30">
                  <span>{formIcon || "🌟"}</span>
                  <span>{formName || "Nome do Selo"}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-zinc-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl h-9 text-xs cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveBadgeModal}
                className="bg-primary hover:bg-primary/90 text-white rounded-xl h-9 text-xs font-bold cursor-pointer"
              >
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
