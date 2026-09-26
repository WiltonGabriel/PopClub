"use client";

import { useState, useEffect } from "react";
import { categoryService, Category } from "../../services/categoryService";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Loader2 } from "lucide-react";
import { parseCategoryEmojiAndName } from "../storefront/CategoryChip";

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (category: Category) => void;
  categoryToEdit?: Category | null;
}

const POPULAR_EMOJIS = [
  "🍇", "🍦", "🥤", "⚡", "🍴", "🍓", "🔥", "✨",
  "🍫", "🥥", "🍧", "🥣", "⭐", "🍒", "🍨", "🍪",
];

export function CategoryFormDialog({
  open,
  onOpenChange,
  onSaved,
  categoryToEdit,
}: CategoryFormDialogProps) {
  const [selectedEmoji, setSelectedEmoji] = useState("🍇");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Sincroniza dados sempre que abrir o modal ou mudar a categoria selecionada
  useEffect(() => {
    if (open) {
      if (categoryToEdit) {
        const parsed = parseCategoryEmojiAndName(categoryToEdit.name);
        setSelectedEmoji(parsed.emoji);
        setName(parsed.cleanName);
      } else {
        setSelectedEmoji("🍇");
        setName("");
      }
      setError("");
    }
  }, [open, categoryToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError("Por favor, digite o nome da categoria.");
      return;
    }

    setLoading(true);
    setError("");

    // Concatena emoji e nome para persistência unificada (Single Source of Truth)
    const fullName = selectedEmoji ? `${selectedEmoji} ${cleanName}` : cleanName;

    try {
      let result: Category;
      if (categoryToEdit) {
        result = await categoryService.updateCategory(categoryToEdit.id, { name: fullName });
      } else {
        result = await categoryService.createCategory(fullName);
      }

      onSaved(result);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Erro ao salvar a categoria.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-full rounded-3xl bg-white dark:bg-[#1F0B22] text-foreground border border-gray-200 dark:border-border/40 shadow-2xl p-6">
        <DialogHeader className="mb-3">
          <DialogTitle className="font-heading text-xl font-bold text-foreground dark:text-foreground">
            {categoryToEdit ? "Editar Categoria & Ícone" : "Nova Categoria"}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {categoryToEdit
              ? "Edite o ícone e o nome exibidos na barra superior e no catálogo"
              : "Crie uma nova seção para agrupar e organizar seus produtos"}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Seletor de Emoji / Ícone */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Ícone da Categoria (Emoji)
            </Label>
            <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50 dark:bg-card/50 rounded-2xl border border-gray-100 dark:border-border/30">
              {POPULAR_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`
                    w-8 h-8 rounded-xl flex items-center justify-center text-lg
                    transition-all duration-150 cursor-pointer
                    ${
                      selectedEmoji === emoji
                        ? "bg-primary text-white scale-110 shadow-sm ring-2 ring-primary/40"
                        : "hover:bg-gray-200 dark:hover:bg-white/10"
                    }
                  `}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Input para Emoji Personalizado */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] text-muted-foreground">Ou digite outro emoji:</span>
              <Input
                value={selectedEmoji}
                onChange={(e) => setSelectedEmoji(e.target.value)}
                maxLength={4}
                className="w-16 h-8 text-center text-base rounded-lg"
              />
            </div>
          </div>

          {/* Nome da Categoria */}
          <div className="space-y-1.5">
            <Label htmlFor="cat-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Nome de Exibição
            </Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 rounded-xl bg-white border-gray-200 text-foreground dark:bg-card dark:border-border/50 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary"
              placeholder="Ex: Explosão de Recheio, Açaí Tradicional..."
              required
            />
          </div>

          {/* Prévia Instantânea da Pílula */}
          <div className="p-3 bg-gray-50 dark:bg-white/[0.02] rounded-2xl border border-gray-100 dark:border-border/30 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Pré-visualização da Pílula:
            </span>
            <div className="flex flex-col items-center justify-center min-w-[76px] px-3.5 py-2 rounded-2xl bg-white dark:bg-[#230E26] border border-primary/50 shadow-xs">
              <span className="text-lg leading-none mb-0.5">{selectedEmoji || "🍧"}</span>
              <span className="text-[10px] font-bold uppercase text-foreground dark:text-foreground whitespace-nowrap">
                {name || "Categoria"}
              </span>
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-xs bg-red-50 dark:bg-red-950/30 p-2.5 rounded-xl border border-red-200 dark:border-red-900/40">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white font-heading font-bold text-xs uppercase tracking-wider shadow-md shadow-primary/20 transition-all cursor-pointer"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </span>
            ) : categoryToEdit ? (
              "Salvar Alterações Instantaneamente"
            ) : (
              "Criar Categoria"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
