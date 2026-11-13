"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { 
  Sparkles, 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2, 
  Check, 
  X, 
  AlertCircle,
  Eye,
  CheckCircle2,
  Image as ImageIcon
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useToast } from "../ui/ToastNotification";
import { ConfirmDialog } from "../ui/ConfirmDialog";

export interface AvatarPreset {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  category: string | null;
  isActive: boolean;
  order: number;
  minMonths?: number;
  minOrders?: number;
  createdAt: string;
  updatedAt: string;
}

const BUILTIN_SVGS = [
  { name: "Sundae Amora", path: "/avatars/avatar-sorvete.svg" },
  { name: "Tigela de Açaí", path: "/avatars/avatar-acai.svg" },
  { name: "Milk Shake", path: "/avatars/avatar-shake.svg" },
  { name: "Picolé Frutas", path: "/avatars/avatar-picole.svg" },
  { name: "Morango Pop", path: "/avatars/avatar-morango.svg" },
  { name: "Banana Split", path: "/avatars/avatar-banana.svg" },
  { name: "Cookie Choco", path: "/avatars/avatar-cookie.svg" },
  { name: "Cereja Pop", path: "/avatars/avatar-cereja.svg" },
  { name: "Casquinha Dupla", path: "/avatars/avatar-casquinha.svg" },
  { name: "Mestre Gelateiro", path: "/avatars/avatar-chef.svg" },
];

export function AvatarPresetManager() {
  const [avatars, setAvatars] = useState<AvatarPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAvatar, setEditingAvatar] = useState<AvatarPreset | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [avatarToDelete, setAvatarToDelete] = useState<AvatarPreset | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("/avatars/avatar-sorvete.svg");
  const [formCategory, setFormCategory] = useState("Oficial");
  const [formOrder, setFormOrder] = useState(0);
  const [formMinMonths, setFormMinMonths] = useState(0);
  const [formMinOrders, setFormMinOrders] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);

  const { showToast } = useToast();

  const fetchAvatars = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/avatars");
      if (!res.ok) {
        throw new Error("Falha ao buscar avatares");
      }
      const data = await res.json();
      setAvatars(data);
    } catch (err: any) {
      console.error(err);
      showToast({
        type: "error",
        title: "Erro de Carregamento",
        message: "Não foi possível carregar os avatares administrativos.",
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAvatars();
  }, [fetchAvatars]);

  const handleOpenCreate = () => {
    setEditingAvatar(null);
    setFormName("");
    setFormDescription("");
    setFormImageUrl("/avatars/avatar-sorvete.svg");
    setFormCategory("Oficial");
    setFormOrder(avatars.length + 1);
    setFormMinMonths(0);
    setFormMinOrders(0);
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (avatar: AvatarPreset) => {
    setEditingAvatar(avatar);
    setFormName(avatar.name);
    setFormDescription(avatar.description);
    setFormImageUrl(avatar.imageUrl);
    setFormCategory(avatar.category || "Oficial");
    setFormOrder(avatar.order);
    setFormMinMonths(avatar.minMonths ?? 0);
    setFormMinOrders(avatar.minOrders ?? 0);
    setFormIsActive(avatar.isActive);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (avatar: AvatarPreset) => {
    try {
      const res = await fetch(`/api/admin/avatars/${avatar.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !avatar.isActive }),
      });

      if (!res.ok) {
        throw new Error("Falha ao atualizar status");
      }

      setAvatars((prev) =>
        prev.map((a) => (a.id === avatar.id ? { ...a, isActive: !a.isActive } : a))
      );

      showToast({
        type: "success",
        title: "Status Atualizado",
        message: `Avatar "${avatar.name}" agora está ${!avatar.isActive ? "ativo" : "inativo"}.`,
      });
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Erro",
        message: err?.message || "Não foi possível alterar o status.",
      });
    }
  };

  const handleDelete = (avatar: AvatarPreset) => {
    setAvatarToDelete(avatar);
  };

  const executeDeleteAvatar = async () => {
    if (!avatarToDelete) return;

    try {
      setDeletingId(avatarToDelete.id);
      const res = await fetch(`/api/admin/avatars/${avatarToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Falha ao excluir avatar");
      }

      setAvatars((prev) => prev.filter((a) => a.id !== avatarToDelete.id));
      showToast({
        type: "success",
        title: "Avatar Excluído",
        message: `O avatar "${avatarToDelete.name}" foi removido do catálogo.`,
      });
      setAvatarToDelete(null);
    } catch (err: unknown) {
      showToast({
        type: "error",
        title: "Erro ao Excluir",
        message: err instanceof Error ? err.message : "Não foi possível excluir o avatar.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim()) {
      showToast({ type: "error", title: "Campo Obrigatório", message: "Informe o nome do avatar." });
      return;
    }
    if (!formDescription.trim()) {
      showToast({ type: "error", title: "Campo Obrigatório", message: "Informe a descrição do avatar." });
      return;
    }
    if (!formImageUrl.trim()) {
      showToast({ type: "error", title: "Campo Obrigatório", message: "Selecione ou informe a imagem do avatar." });
      return;
    }

    try {
      setIsSaving(true);

      const payload = {
        name: formName.trim().slice(0, 25),
        description: formDescription.trim().slice(0, 40),
        imageUrl: formImageUrl.trim(),
        category: formCategory.trim() || null,
        order: Number(formOrder),
        minMonths: Number(formMinMonths),
        minOrders: Number(formMinOrders),
        isActive: formIsActive,
      };

      let res: Response;
      if (editingAvatar) {
        res = await fetch(`/api/admin/avatars/${editingAvatar.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/admin/avatars", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Falha ao salvar avatar");
      }

      const saved = await res.json();

      if (editingAvatar) {
        setAvatars((prev) => prev.map((a) => (a.id === saved.id ? saved : a)));
        showToast({
          type: "success",
          title: "Alterações Salvas",
          message: `O avatar "${saved.name}" foi atualizado com sucesso.`,
        });
      } else {
        setAvatars((prev) => [...prev, saved].sort((a, b) => a.order - b.order));
        showToast({
          type: "success",
          title: "Avatar Cadastrado",
          message: `O avatar "${saved.name}" foi adicionado com sucesso.`,
        });
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      showToast({
        type: "error",
        title: "Erro ao Salvar",
        message: err?.message || "Não foi possível salvar o avatar.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const activeCount = avatars.filter((a) => a.isActive).length;
  const inactiveCount = avatars.length - activeCount;

  return (
    <section className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-5 sm:p-7 shadow-sm space-y-6 animate-in fade-in duration-150">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-border/30">
        <div>
          <h3 className="font-heading text-lg sm:text-xl font-bold uppercase tracking-wide flex items-center gap-2 text-foreground dark:text-foreground">
            <Sparkles className="w-5 h-5 text-primary" />
            Catálogo Oficial de Avatares
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Gerencie as ilustrações que os clientes podem escolher em seus perfis para personalização de conta e pedidos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={handleOpenCreate}
            className="bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white font-heading text-xs uppercase tracking-wider rounded-xl font-bold flex items-center gap-2 h-11 px-5 shadow-md shadow-primary/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Novo Avatar
          </Button>
        </div>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="p-3.5 sm:p-4 rounded-xl bg-gray-50 dark:bg-background/60 border border-gray-100 dark:border-border/30 flex flex-col items-center sm:items-start">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Cadastrado</span>
          <span className="font-mono text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">{avatars.length}</span>
        </div>
        <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30 flex flex-col items-center sm:items-start">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Ativos no Modal</span>
          <span className="font-mono text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{activeCount}</span>
        </div>
        <div className="p-3.5 sm:p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 flex flex-col items-center sm:items-start">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Inativos</span>
          <span className="font-mono text-xl sm:text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">{inactiveCount}</span>
        </div>
      </div>

      {/* Grid de Avatares */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs">Carregando catálogo de avatares...</p>
        </div>
      ) : avatars.length === 0 ? (
        <div className="p-10 text-center border border-dashed border-gray-200 dark:border-border/40 rounded-2xl space-y-3 bg-gray-50/50 dark:bg-background/40">
          <div className="w-14 h-14 rounded-2xl bg-primary/5 dark:bg-primary/95/40 text-primary flex items-center justify-center mx-auto text-2xl">
            🎨
          </div>
          <h4 className="font-heading font-bold text-sm text-foreground dark:text-foreground">
            Nenhum avatar cadastrado
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            Clique em &ldquo;Novo Avatar&rdquo; para adicionar ilustrações e personagens oficiais para seus clientes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {avatars.map((avatar) => (
            <div
              key={avatar.id}
              className={`relative rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                avatar.isActive
                  ? "bg-white dark:bg-[#1D0820] border-gray-200 dark:border-border/50 shadow-xs hover:border-primary/50"
                  : "bg-gray-50/70 dark:bg-[#150517]/50 border-dashed border-gray-300 dark:border-border/30 opacity-70 hover:opacity-100"
              }`}
            >
              {/* Badge de Status e Ordem */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300">
                  #{avatar.order}
                </span>

                <button
                  type="button"
                  onClick={() => handleToggleStatus(avatar)}
                  title={avatar.isActive ? "Clique para desativar" : "Clique para ativar"}
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
                    avatar.isActive
                      ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200"
                      : "bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-300"
                  }`}
                >
                  {avatar.isActive ? "Ativo" : "Inativo"}
                </button>
              </div>

              {/* Imagem Circular Central */}
              <div className="flex flex-col items-center text-center my-1">
                <div className="w-20 h-20 rounded-full bg-gray-50 dark:bg-[#2A1030] p-1.5 shadow-sm border border-gray-100 dark:border-border/40 mb-3 overflow-hidden">
                  <Image
                    src={avatar.imageUrl}
                    alt={avatar.name}
                    width={80}
                    height={80}
                    className="w-full h-full object-contain"
                  />
                </div>

                <h4 className="font-heading font-bold text-sm text-gray-900 dark:text-white leading-tight">
                  {avatar.name}
                </h4>

                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 min-h-[32px]">
                  {avatar.description}
                </p>

                <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
                  {avatar.category && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary dark:text-muted-foreground border border-primary/20">
                      {avatar.category}
                    </span>
                  )}
                  {((avatar.minMonths ?? 0) > 0 || (avatar.minOrders ?? 0) > 0) ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      🔒 {avatar.minOrders ? `${avatar.minOrders} pedidos` : ""}{avatar.minOrders && avatar.minMonths ? " ou " : ""}{avatar.minMonths ? `${avatar.minMonths}m de conta` : ""}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      🌟 Livre
                    </span>
                  )}
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="pt-3 mt-3 border-t border-gray-100 dark:border-border/30 flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenEdit(avatar)}
                  className="h-8 px-2.5 text-xs text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={deletingId === avatar.id}
                  onClick={() => handleDelete(avatar)}
                  className="h-8 px-2 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-1 cursor-pointer"
                >
                  {deletingId === avatar.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Criação / Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/50 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-border/30">
              <div>
                <h3 className="font-heading font-bold text-base sm:text-lg text-gray-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  {editingAvatar ? "Editar Avatar Oficial" : "Novo Avatar Oficial"}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure o nome, descrição, vetor visual e status no catálogo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Preview Dinâmico */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-background/80 border border-gray-200 dark:border-border/30 flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white dark:bg-[#2A1030] p-1 shadow-sm border border-gray-200 dark:border-border/40 shrink-0 overflow-hidden flex items-center justify-center">
                  {formImageUrl ? (
                    <Image
                      src={formImageUrl}
                      alt="Preview"
                      width={64}
                      height={64}
                      className="w-full h-full object-contain"
                      onError={() => {
                        // Fallback em caso de erro de imagem
                      }}
                    />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary dark:text-muted-foreground">
                    Preview no Perfil
                  </span>
                  <h4 className="font-heading font-bold text-sm text-gray-900 dark:text-white truncate">
                    {formName || "Nome do Avatar"}
                  </h4>
                  <p className="text-xs text-muted-foreground truncate">
                    {formDescription || "Breve descrição do avatar oficial..."}
                  </p>
                </div>
              </div>

              {/* Nome */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Nome do Avatar *
                  </Label>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {formName.length}/25
                  </span>
                </div>
                <Input
                  type="text"
                  placeholder="Ex: Sundae Amora, Picolé Pop..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value.slice(0, 25))}
                  maxLength={25}
                  className="rounded-xl"
                  required
                />
              </div>

              {/* Descrição */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Descrição Breve *
                  </Label>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {formDescription.length}/40
                  </span>
                </div>
                <Input
                  type="text"
                  placeholder="Ex: Clássico sundae artesanal com calda de amora"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value.slice(0, 40))}
                  maxLength={40}
                  className="rounded-xl"
                  required
                />
              </div>

              {/* Seletor de Ícone / SVG Rápido */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center justify-between">
                  <span>Escolha uma Ilustração SVG Oficial</span>
                  <span className="text-[10px] font-normal text-muted-foreground lowercase">10 vetores disponíveis</span>
                </Label>

                <div className="grid grid-cols-5 gap-2 p-2 rounded-xl bg-gray-50 dark:bg-background/80 border border-gray-200 dark:border-border/30">
                  {BUILTIN_SVGS.map((svg) => {
                    const isSelected = formImageUrl === svg.path;
                    return (
                      <button
                        key={svg.path}
                        type="button"
                        onClick={() => {
                          setFormImageUrl(svg.path);
                          if (!formName) setFormName(svg.name);
                        }}
                        title={svg.name}
                        className={`p-1.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          isSelected
                            ? "border-primary bg-primary/10 ring-2 ring-primary/30 scale-105"
                            : "border-transparent hover:bg-white dark:hover:bg-white/5 hover:border-gray-200"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-white dark:bg-[#2A1030] p-1 shadow-2xs overflow-hidden">
                          <Image
                            src={svg.path}
                            alt={svg.name}
                            width={40}
                            height={40}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <span className="text-[9px] font-medium text-center truncate w-full">
                          {svg.name.split(" ")[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Input de URL / Caminho Personalizado */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Caminho do SVG ou URL da Imagem *
                </Label>
                <Input
                  type="text"
                  placeholder="/avatars/avatar-sorvete.svg ou https://..."
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  className="rounded-xl font-mono text-xs"
                  required
                />
              </div>

              {/* Categoria e Ordem */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Categoria
                  </Label>
                  <Input
                    type="text"
                    placeholder="Ex: Sobremesas, Frutas..."
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Ordem de Exibição
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={formOrder}
                    onChange={(e) => setFormOrder(parseInt(e.target.value, 10) || 0)}
                    className="rounded-xl"
                  />
                </div>
              </div>

              {/* Requisitos de Desbloqueio (Fidelidade por Meses e Compras) */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-purple-500/5 border border-purple-500/20">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                    Meses de Conta (Mínimo)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={formMinMonths}
                    onChange={(e) => setFormMinMonths(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="rounded-xl bg-white dark:bg-background"
                  />
                  <p className="text-[10px] text-muted-foreground">0 = liberado imediatamente</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                    Compras Feitas (Mínimo)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={formMinOrders}
                    onChange={(e) => setFormMinOrders(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="rounded-xl bg-white dark:bg-background"
                  />
                  <p className="text-[10px] text-muted-foreground">0 = sem exigência de compras</p>
                </div>
              </div>

              {/* Status Ativo / Inativo */}
              <div className="p-3 rounded-xl border border-gray-200 dark:border-border/30 flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                    Avatar Ativo no Catálogo
                  </h5>
                  <p className="text-[11px] text-muted-foreground">
                    Quando ativo, os clientes poderão selecioná-lo no modal do perfil.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-5 h-5 accent-[hsl(var(--primary))] rounded-md cursor-pointer"
                />
              </div>

              {/* Botões do Rodapé */}
              <div className="pt-3 border-t border-gray-100 dark:border-border/30 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl text-xs font-bold uppercase tracking-wider h-11 px-4 cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-heading font-bold text-xs uppercase tracking-wider rounded-xl h-11 px-6 shadow-md shadow-primary/20 cursor-pointer flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Salvar Alterações
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!avatarToDelete}
        onOpenChange={(open) => {
          if (!open && !deletingId) setAvatarToDelete(null);
        }}
        title="Excluir Avatar Oficial"
        description={`Tem certeza que deseja excluir o avatar "${avatarToDelete?.name || ""}"?`}
        confirmLabel="Excluir Avatar"
        variant="danger"
        loading={Boolean(deletingId)}
        onConfirm={executeDeleteAvatar}
      />
    </section>
  );
}
