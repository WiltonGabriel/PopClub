"use client";

import { useState, useEffect, useMemo } from "react";
import { productService, Product } from "../../services/productService";
import { Category } from "../../services/categoryService";
import { badgeService, CardBadge } from "../../services/badgeService";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { ImageCropperDialog } from "./ImageCropperDialog";
import {
  Sparkles,
  Image as ImageIcon,
  Upload,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Tag,
} from "lucide-react";

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (product: Product) => void;
  productToEdit?: Product | null;
  categories: Category[];
}

export function ProductFormDialog({
  open,
  onOpenChange,
  onSaved,
  productToEdit,
  categories,
}: ProductFormDialogProps) {
  const [name, setName] = useState(productToEdit?.name || "");
  const [description, setDescription] = useState(productToEdit?.description || "");
  const [price, setPrice] = useState(productToEdit?.price !== undefined ? productToEdit.price.toString() : "");
  const [categoryId, setCategoryId] = useState(productToEdit?.category_id || "");
  const [cardBadgeId, setCardBadgeId] = useState<string>(productToEdit?.cardBadgeId || "none");
  const [badges, setBadges] = useState<CardBadge[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Estados para o Modal de Recorte
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(productToEdit?.name || "");
      setDescription(productToEdit?.description || "");
      setPrice(productToEdit?.price !== undefined ? productToEdit.price.toString() : "");
      setCategoryId(productToEdit?.category_id || (categories.length > 0 ? categories[0].id : ""));
      setCardBadgeId(productToEdit?.cardBadgeId || "none");
      setFile(null);
      setError("");
      setRawImageSrc(null);
      setCropModalOpen(false);
      badgeService.getBadges().then(setBadges).catch(() => {});
    }
  }, [open, productToEdit, categories]);

  const previewUrl = useMemo(() => {
    if (file) {
      return URL.createObjectURL(file);
    }
    return productToEdit?.imageUrl || "";
  }, [file, productToEdit?.imageUrl]);

  const selectedCategory = useMemo(() => {
    return categories.find((c) => c.id === categoryId);
  }, [categories, categoryId]);

  const selectedBadge = useMemo(() => {
    if (!cardBadgeId || cardBadgeId === "none") return null;
    return badges.find((b) => b.id === cardBadgeId) || null;
  }, [badges, cardBadgeId]);

  const formattedPrice = useMemo(() => {
    const num = parseFloat(price);
    if (isNaN(num)) return "0,00";
    return num.toFixed(2).replace(".", ",");
  }, [price]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Reseta o input para permitir selecionar o mesmo arquivo se desejar
    e.target.value = "";

    // 1. Validação de formato (JPEG, PNG, WebP)
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowedMimeTypes.includes(selectedFile.type.toLowerCase())) {
      setError("Formato inválido. Apenas imagens JPEG, PNG ou WebP são aceitas.");
      return;
    }

    // 2. Validação de tamanho (máximo 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (selectedFile.size > MAX_SIZE) {
      setError(`O arquivo selecionado excede o limite de 10MB (${(selectedFile.size / (1024 * 1024)).toFixed(1)}MB).`);
      return;
    }

    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      setRawImageSrc(reader.result as string);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleCropComplete = (croppedFile: File) => {
    setFile(croppedFile);
    setCropModalOpen(false);
    setRawImageSrc(null);
  };

  const handleCropCancel = () => {
    setCropModalOpen(false);
    setRawImageSrc(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!productToEdit && !file) {
      setError("Por favor, selecione e recorte uma foto para o produto.");
      setLoading(false);
      return;
    }

    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      setError("Por favor, informe um preço de venda válido maior que zero.");
      setLoading(false);
      return;
    }

    if (!categoryId) {
      setError("Por favor, selecione a categoria do produto.");
      setLoading(false);
      return;
    }

    try {
      let result: Product;
      const catName = selectedCategory?.name;
      const finalCardBadgeId = cardBadgeId === "none" ? null : cardBadgeId;

      if (productToEdit) {
        result = await productService.updateProduct(
          productToEdit.id,
          {
            name: name.trim(),
            description: description.trim(),
            price: numPrice,
            category_id: categoryId,
            category: catName,
            cardBadgeId: finalCardBadgeId,
          },
          file || undefined
        );
      } else {
        result = await productService.createProduct(
          {
            name: name.trim(),
            description: description.trim(),
            price: numPrice,
            category_id: categoryId,
            category: catName,
            imageUrl: "",
            cardBadgeId: finalCardBadgeId,
          },
          file || undefined
        );
      }

      onSaved(result);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Erro ao salvar o produto.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full max-w-3xl sm:max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-0 bg-white dark:bg-[#1F0B22] border border-gray-200 dark:border-border/40 shadow-2xl text-foreground">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-border/30">
            {/* Lado Esquerdo: Prévia em Tempo Real (Live Preview) */}
            <div className="p-6 sm:p-8 bg-gray-50/70 dark:bg-background/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    Prévia no Cardápio
                  </span>
                  {selectedCategory && (
                    <span className="text-[10px] font-semibold bg-primary/10 text-primary dark:text-muted-foreground px-2 py-0.5 rounded-full border border-primary/20 truncate max-w-[130px]">
                      {selectedCategory.name}
                    </span>
                  )}
                </div>

                {/* Card do Produto (Design idêntico ao da Página Inicial) */}
                <div className="w-full max-w-[270px] mx-auto bg-white dark:bg-[#230E26] rounded-2xl border border-gray-200 dark:border-border/40 overflow-hidden shadow-lg transition-transform duration-200 hover:scale-[1.02]">
                  {/* Foto do Produto */}
                  <div className="aspect-square w-full bg-gray-100 dark:bg-background relative flex items-center justify-center overflow-hidden">
                    {previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewUrl}
                        alt="Prévia do produto"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 gap-2 p-4 text-center">
                        <div className="w-12 h-12 rounded-full bg-gray-200/70 dark:bg-white/5 flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-gray-400" />
                        </div>
                        <span className="text-xs font-medium">Nenhuma foto selecionada</span>
                      </div>
                    )}
                    {selectedCategory && (
                      <span className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                        {selectedCategory.name}
                      </span>
                    )}
                    {selectedBadge && (
                      <span
                        style={{
                          backgroundColor: selectedBadge.bgColor,
                          color: selectedBadge.textColor,
                        }}
                        className="absolute top-2.5 right-2.5 rounded-full px-2.5 py-0.5 text-xs font-semibold flex items-center gap-1 shadow-sm select-none z-10"
                      >
                        {selectedBadge.icon && <span>{selectedBadge.icon}</span>}
                        <span>{selectedBadge.text}</span>
                      </span>
                    )}
                  </div>

                  {/* Detalhes do Produto */}
                  <div className="p-4 flex flex-col gap-1.5">
                    <h4 className="font-heading font-bold text-base text-foreground dark:text-foreground line-clamp-1">
                      {name.trim() || "Nome do Produto"}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 min-h-[32px] leading-relaxed">
                      {description.trim() || "A descrição apetitosa do produto aparecerá aqui para seus clientes..."}
                    </p>
                    <div className="flex items-center justify-between pt-3 mt-2 border-t border-gray-100 dark:border-border/30">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Preço</span>
                        <span className="font-heading font-black text-lg text-emerald-600 dark:text-emerald-400">
                          R$ {formattedPrice}
                        </span>
                      </div>
                      <span className="text-xs font-semibold bg-gradient-to-r from-primary to-accent text-white px-3 py-1.5 rounded-xl shadow-sm">
                        + Adicionar
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center mt-6">
                * Visualização em tempo real das alterações na página inicial da loja.
              </p>
            </div>

            {/* Lado Direito: Formulário com Linguagem Limpa */}
            <div className="p-6 sm:p-8 flex flex-col justify-center bg-white dark:bg-[#1F0B22]">
              <DialogHeader className="mb-6">
                <DialogTitle className="font-heading text-2xl sm:text-3xl font-bold text-foreground dark:text-foreground">
                  {productToEdit ? "Editar Produto" : "Novo Produto"}
                </DialogTitle>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Atualize as informações que aparecem no cardápio
                </p>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Nome do Produto */}
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                    Nome do Produto
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-11 rounded-xl bg-white border-gray-200 text-gray-900 dark:bg-card dark:border-border/50 dark:text-white focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
                    placeholder="Ex: Copo 700ml Especial"
                  />
                </div>

                {/* Descrição */}
                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                    Descrição
                  </Label>
                  <textarea
                    id="description"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    className="w-full rounded-xl p-3 text-sm bg-white border border-gray-200 text-gray-900 dark:bg-card dark:border-border/50 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 leading-relaxed"
                    placeholder="Ex: Açaí puro batido na hora com banana, morango e granola crocante..."
                  />
                </div>

                {/* Preço e Categoria */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Preço de Venda */}
                  <div className="space-y-1.5">
                    <Label htmlFor="price" className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                      Preço de Venda (R$)
                    </Label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 font-bold text-sm text-primary dark:text-muted-foreground pointer-events-none">
                        R$
                      </span>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        required
                        className="h-11 rounded-xl bg-white border-gray-200 text-gray-900 dark:bg-card dark:border-border/50 dark:text-white pl-10 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary font-semibold"
                        placeholder="0,00"
                      />
                    </div>
                  </div>

                  {/* Categoria */}
                  <div className="space-y-1.5">
                    <Label htmlFor="category" className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                      Categoria
                    </Label>
                    <Select value={categoryId} onValueChange={(val) => setCategoryId(val || "")} required>
                      <SelectTrigger className="w-full h-11 rounded-xl bg-white border-gray-200 text-gray-900 dark:bg-card dark:border-border/50 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border border-gray-200 dark:border-border/50 bg-white dark:bg-[#1F0B22] shadow-xl max-h-60 z-[60]">
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id} className="cursor-pointer text-sm py-2 hover:bg-primary/10">
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Selo do Card (Badge Flutuante) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="card-badge" className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                      Selo do Card (Badge)
                    </Label>
                    <span className="text-[10px] text-muted-foreground font-normal">
                      opcional
                    </span>
                  </div>
                  <Select value={cardBadgeId} onValueChange={(val) => setCardBadgeId(val || "none")}>
                    <SelectTrigger id="card-badge" className="w-full h-11 rounded-xl bg-white border-gray-200 text-gray-900 dark:bg-card dark:border-border/50 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20">
                      <SelectValue placeholder="Selecione um selo..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border border-gray-200 dark:border-border/50 bg-white dark:bg-[#1F0B22] shadow-xl max-h-60 z-[60]">
                      <SelectItem value="none" className="cursor-pointer text-sm py-2">
                        <span className="text-muted-foreground">[ Nenhum selo ]</span>
                      </SelectItem>
                      {badges.map((b) => (
                        <SelectItem key={b.id} value={b.id} className="cursor-pointer text-sm py-2 hover:bg-primary/10">
                          <div className="flex items-center gap-2">
                            <span
                              style={{ backgroundColor: b.bgColor, color: b.textColor }}
                              className="px-2.5 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 shadow-2xs"
                            >
                              {b.icon && <span>{b.icon}</span>}
                              <span>{b.text}</span>
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Foto do Produto com Recorte 1:1 */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="image" className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                      Foto do Produto
                    </Label>
                    <span className="text-[10px] font-semibold text-primary dark:text-muted-foreground bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                      1:1 Quadrado • até 10MB
                    </span>
                  </div>

                  <div className="relative border-2 border-dashed border-gray-200 dark:border-border/50 hover:border-primary dark:hover:border-primary bg-gray-50/60 dark:bg-card/40 rounded-xl p-3 transition-colors flex items-center gap-3 cursor-pointer group">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary dark:text-muted-foreground flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      {file ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Upload className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground dark:text-foreground truncate">
                        {file ? file.name : (productToEdit?.imageUrl ? "Foto atual mantida (clique para alterar)" : "Clique para escolher a foto")}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        JPEG, PNG ou WebP. Você poderá recortar em seguida.
                      </p>
                    </div>
                    <Input
                      id="image"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>
                </div>

                {/* Feedback de Erro */}
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Botão de Ação Largo e Visível */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white font-heading font-bold text-base uppercase tracking-wider shadow-lg shadow-primary/25 transition-all mt-2"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Salvando...
                    </span>
                  ) : (
                    productToEdit ? "Salvar Alterações" : "Cadastrar Produto"
                  )}
                </Button>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Recorte 1:1 para Produtos */}
      <ImageCropperDialog
        open={cropModalOpen}
        imageSrc={rawImageSrc}
        aspectRatio={1}
        aspectLabel="1:1 (Quadrado)"
        onCropComplete={handleCropComplete}
        onCancel={handleCropCancel}
      />
    </>
  );
}
