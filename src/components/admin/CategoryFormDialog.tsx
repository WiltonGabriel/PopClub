"use client";

import { useState, useEffect, useRef } from "react";
import { categoryService, Category } from "../../services/categoryService";
import { productService } from "../../services/productService";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Loader2, Upload, X, Image as ImageIcon } from "lucide-react";
import { parseCategoryEmojiAndName } from "../storefront/CategoryChip";
import { ImageCropperDialog } from "./ImageCropperDialog";

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
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Sincroniza dados sempre que abrir o modal ou mudar a categoria selecionada
  useEffect(() => {
    if (open) {
      if (categoryToEdit) {
        const parsed = parseCategoryEmojiAndName(categoryToEdit.name);
        setSelectedEmoji(parsed.emoji);
        setName(parsed.cleanName);
        setImageUrl(categoryToEdit.imageUrl || "");
      } else {
        setSelectedEmoji("🍇");
        setName("");
        setImageUrl("");
      }
      setImageFile(null);
      setRawImageSrc(null);
      setCropModalOpen(false);
      setError("");
    }
  }, [open, categoryToEdit]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    e.target.value = "";

    const allowedMime = ["image/jpeg", "image/png", "image/webp", "image/jpg", "image/svg+xml"];
    const ext = selectedFile.name.toLowerCase();
    const isSvg = selectedFile.type === "image/svg+xml" || ext.endsWith(".svg");

    if (!allowedMime.includes(selectedFile.type.toLowerCase()) && !isSvg) {
      setError("Apenas imagens WebP, SVG, PNG ou JPG são aceitas.");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("O ícone da categoria deve ter no máximo 5MB.");
      return;
    }

    setError("");

    if (isSvg) {
      setImageFile(selectedFile);
      setImageUrl(URL.createObjectURL(selectedFile));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setRawImageSrc(reader.result as string);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleCropComplete = (croppedFile: File) => {
    setImageFile(croppedFile);
    setImageUrl(URL.createObjectURL(croppedFile));
    setCropModalOpen(false);
    setRawImageSrc(null);
  };

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
      let finalImageUrl: string | null = imageUrl || null;
      if (imageFile) {
        finalImageUrl = await productService.uploadImage(imageFile, "category");
      }

      let result: Category;
      if (categoryToEdit) {
        result = await categoryService.updateCategory(categoryToEdit.id, {
          name: fullName,
          imageUrl: finalImageUrl,
        });
      } else {
        result = await categoryService.createCategory(
          fullName,
          0,
          false,
          null,
          true,
          finalImageUrl
        );
      }

      onSaved(result);
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar a categoria.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md w-full rounded-3xl bg-white dark:bg-[#1F0B22] text-foreground border border-gray-200 dark:border-border/40 shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
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
            {/* Upload de Imagem Própria (WebP/SVG/PNG) */}
            <div className="space-y-2 p-3 rounded-2xl bg-gray-50 dark:bg-card/50 border border-gray-100 dark:border-border/30">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-primary" />
                  Ícone / Imagem Própria
                </Label>
                <span className="text-[10px] text-primary font-semibold">1:1 (WebP, SVG, PNG)</span>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <div className="w-12 h-12 rounded-xl bg-white dark:bg-card border border-border overflow-hidden shrink-0 flex items-center justify-center p-1 shadow-2xs">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt="Ícone" className="w-full h-full object-contain" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-zinc-400" />
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 text-xs rounded-xl font-bold gap-1 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-primary" />
                      <span>{imageUrl ? "Alterar" : "Escolher"}</span>
                    </Button>
                    {imageUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setImageFile(null);
                          setImageUrl("");
                        }}
                        className="h-8 text-xs rounded-xl text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        Remover
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Se enviar imagem, ela terá prioridade sobre o emoji na vitrine.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/webp,image/svg+xml,image/png,image/jpeg"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* Seletor de Emoji / Ícone Fallback */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Ícone Alternativo (Emoji)
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
                Pré-visualização:
              </span>
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white dark:bg-[#230E26] border border-primary/50 shadow-xs">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt="" className="w-5 h-5 object-contain" />
                ) : (
                  <span className="text-lg leading-none">{selectedEmoji || "🍧"}</span>
                )}
                <span className="text-xs font-bold text-foreground dark:text-foreground whitespace-nowrap">
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

      <ImageCropperDialog
        open={cropModalOpen}
        imageSrc={rawImageSrc}
        aspectRatio={1}
        aspectLabel="1:1 (Quadrado)"
        onCropComplete={handleCropComplete}
        onCancel={() => {
          setCropModalOpen(false);
          setRawImageSrc(null);
        }}
      />
    </>
  );
}
