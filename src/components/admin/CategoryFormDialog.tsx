"use client";

import { useState } from "react";
import { categoryService, Category } from "../../services/categoryService";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Loader2 } from "lucide-react";

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (category: Category) => void;
  categoryToEdit?: Category | null;
}

export function CategoryFormDialog({ open, onOpenChange, onSaved, categoryToEdit }: CategoryFormDialogProps) {
  const [name, setName] = useState(categoryToEdit?.name || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let result;
      if (categoryToEdit) {
        result = await categoryService.updateCategory(categoryToEdit.id, { name: name.trim() });
      } else {
        result = await categoryService.createCategory(name.trim());
      }
      onSaved(result);
      onOpenChange(false);
      setName("");
    } catch (err: any) {
      setError(err.message || "Erro ao salvar a categoria.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-full rounded-2xl bg-white dark:bg-[#1F0B22] text-foreground border border-gray-200 dark:border-[#512B54]/40 shadow-xl p-6">
        <DialogHeader className="mb-4">
          <DialogTitle className="font-heading text-xl font-bold text-[#4C264F] dark:text-[#F9F5F9]">
            {categoryToEdit ? "Editar Categoria" : "Nova Categoria"}
          </DialogTitle>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {categoryToEdit ? "Atualize o nome da seção na página inicial" : "Crie uma nova seção para agrupar produtos"}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cat-name" className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
              Nome da Categoria
            </Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 rounded-xl bg-white border-gray-200 text-gray-900 dark:bg-[#2B132D] dark:border-[#512B54]/50 dark:text-white focus-visible:ring-2 focus-visible:ring-[#9306CF]/20 focus-visible:border-[#9306CF]"
              placeholder="Ex: Açaí Tradicional, Pop Shakes..."
              required
            />
          </div>

          {error && (
            <p className="text-red-500 text-xs bg-red-50 dark:bg-red-950/30 p-2.5 rounded-lg border border-red-200 dark:border-red-900/40">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full h-11 rounded-xl bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-95 text-white font-heading font-bold text-sm uppercase tracking-wider shadow-md shadow-[#9306CF]/20 transition-all"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </span>
            ) : (
              categoryToEdit ? "Salvar Alterações" : "Criar Categoria"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
