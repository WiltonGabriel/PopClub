"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { productService, Product, ProductDependencyImpact } from "../../services/productService";
import { categoryService, Category } from "../../services/categoryService";
import { badgeService, CardBadge } from "../../services/badgeService";
import { addonService, AddonGroup } from "../../services/addonService";
import { AddonOrganizationService } from "@/domain/services/AddonOrganizationService";
import { formatDecimal } from "@/lib/formatters";
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
  IceCream,
  ChevronDown,
  Users,
  Save,
  Crop,
  AlertTriangle,
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
  const [servesText, setServesText] = useState(productToEdit?.servesText || "");
  const [categoryId, setCategoryId] = useState(productToEdit?.category_id || "");
  const [cardBadgeId, setCardBadgeId] = useState<string>(productToEdit?.cardBadgeId || "none");
  const [badges, setBadges] = useState<CardBadge[]>([]);
  const [availableAddonGroups, setAvailableAddonGroups] = useState<AddonGroup[]>([]);
  const [selectedAddonGroupIds, setSelectedAddonGroupIds] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Categorias ativas com fallback assíncrono caso o componente pai ainda não as tenha carregado
  const [internalCategories, setInternalCategories] = useState<Category[]>(categories || []);

  useEffect(() => {
    if (categories && categories.length > 0) {
      setInternalCategories(categories);
    } else if (open) {
      categoryService.getCategories().then((cats) => {
        if (cats && cats.length > 0) setInternalCategories(cats);
      }).catch(() => {});
    }
  }, [categories, open]);

  const activeCategories = useMemo(() => {
    return internalCategories.length > 0 ? internalCategories : categories;
  }, [internalCategories, categories]);

  // Estados para o Modal de Recorte Livre e rastreamento seguro de sessão de edição
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const initializedKeyRef = useRef<string | null>(null);
  const [dependencyImpact, setDependencyImpact] = useState<ProductDependencyImpact | null>(null);
  const [initialSnapshot, setInitialSnapshot] = useState<{
    name: string;
    description: string;
    price: string;
    servesText: string;
    categoryId: string;
    cardBadgeId: string;
    addonGroupIds: string[];
  } | null>(null);

  // Inicializa o formulário SOMENTE quando o modal abre ou alterna para outro produto (nunca reseta file ao recarregar categorias)
  useEffect(() => {
    if (!open) {
      initializedKeyRef.current = null;
      setDependencyImpact(null);
      return;
    }

    const sessionKey = `${productToEdit?.id ?? "new"}`;
    if (initializedKeyRef.current === sessionKey) {
      return;
    }
    initializedKeyRef.current = sessionKey;
    setDependencyImpact(null);

    const initName = productToEdit?.name || "";
    const initDesc = productToEdit?.description || "";
    const initPrice = productToEdit?.price !== undefined ? productToEdit.price.toString() : "";
    const initServes = productToEdit?.servesText || "";
    const list = activeCategories.length > 0 ? activeCategories : categories;
    const currentCatId = productToEdit?.category_id || productToEdit?.categoryId;
    const currentCatName = productToEdit?.category;
    const foundCategory = list.find((c) =>
      (currentCatId && c.id === currentCatId) ||
      (currentCatName && (c.name.toLowerCase() === currentCatName.toLowerCase() || c.id === currentCatName))
    );
    const targetId = foundCategory?.id || currentCatId || (list.length > 0 ? list[0].id : "");
    const initBadge = productToEdit?.cardBadgeId || "none";
    const initAddonIds = productToEdit?.addonGroupIds || [];

    setName(initName);
    setDescription(initDesc);
    setPrice(initPrice);
    setServesText(initServes);
    setCategoryId(targetId);
    setCardBadgeId(initBadge);
    setSelectedAddonGroupIds(initAddonIds);
    setFile(null);
    setError("");
    setRawImageSrc(null);
    setCropModalOpen(false);

    setInitialSnapshot({
      name: initName,
      description: initDesc,
      price: initPrice,
      servesText: initServes,
      categoryId: targetId,
      cardBadgeId: initBadge,
      addonGroupIds: [...initAddonIds],
    });

    badgeService.getBadges().then(setBadges).catch(() => {});

    addonService.getGroups().then((groups) => {
      setAvailableAddonGroups(AddonOrganizationService.sortAddonGroups(groups.filter((g) => g.isActive)));
    }).catch(() => {});

    if (productToEdit?.id && (!productToEdit.addonGroupIds || productToEdit.addonGroupIds.length === 0)) {
      productService.getProductById(productToEdit.id).then((p) => {
        if (p.addonGroupIds && p.addonGroupIds.length > 0) {
          setSelectedAddonGroupIds(p.addonGroupIds);
          setInitialSnapshot((prev) =>
            prev ? { ...prev, addonGroupIds: [...p.addonGroupIds!] } : prev
          );
        }
      }).catch(() => {});
    }

    if (productToEdit?.id) {
      productService
        .getProductImpact(productToEdit.id)
        .then(setDependencyImpact)
        .catch(() => setDependencyImpact(null));
    }
  }, [open, productToEdit, categories, activeCategories]);

  // Se categorias carregarem depois da abertura e categoryId ainda estiver vazio, seleciona a primeira sem tocar no restante do estado
  useEffect(() => {
    if (!open || categoryId) return;
    const list = activeCategories.length > 0 ? activeCategories : categories;
    if (list.length > 0) {
      setCategoryId(list[0].id);
      setInitialSnapshot((prev) =>
        prev && !prev.categoryId ? { ...prev, categoryId: list[0].id } : prev
      );
    }
  }, [open, categoryId, activeCategories, categories]);

  // Gerencia ciclo de vida do ObjectURL da foto recortada
  useEffect(() => {
    if (!file) {
      setFilePreviewUrl(null);
      return;
    }
    const objUrl = URL.createObjectURL(file);
    setFilePreviewUrl(objUrl);
    return () => {
      URL.revokeObjectURL(objUrl);
    };
  }, [file]);

  const previewUrl = useMemo(() => {
    if (filePreviewUrl) return filePreviewUrl;
    return productToEdit?.imageUrl || "";
  }, [filePreviewUrl, productToEdit?.imageUrl]);

  const hasUnsavedChanges = useMemo(() => {
    if (!open) return false;
    if (file) return true;
    if (!initialSnapshot) return false;
    const sameAddons =
      initialSnapshot.addonGroupIds.length === selectedAddonGroupIds.length &&
      initialSnapshot.addonGroupIds.every((id, i) => selectedAddonGroupIds[i] === id);
    return (
      name !== initialSnapshot.name ||
      description !== initialSnapshot.description ||
      price !== initialSnapshot.price ||
      servesText !== initialSnapshot.servesText ||
      categoryId !== initialSnapshot.categoryId ||
      cardBadgeId !== initialSnapshot.cardBadgeId ||
      !sameAddons
    );
  }, [
    open,
    file,
    initialSnapshot,
    name,
    description,
    price,
    servesText,
    categoryId,
    cardBadgeId,
    selectedAddonGroupIds,
  ]);

  const selectedCategory = useMemo(() => {
    const list = activeCategories.length > 0 ? activeCategories : categories;
    return list.find((c) => c.id === categoryId || c.name.toLowerCase() === categoryId.toLowerCase()) || null;
  }, [activeCategories, categories, categoryId]);

  const selectedBadge = useMemo(() => {
    if (!cardBadgeId || cardBadgeId === "none") return null;
    return badges.find((b) => b.id === cardBadgeId) || null;
  }, [badges, cardBadgeId]);

  const formattedPrice = useMemo(() => {
    return formatDecimal(price);
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
      const catName = selectedCategory?.name || productToEdit?.category || "Outros";
      const finalCardBadgeId = cardBadgeId === "none" ? null : cardBadgeId;
      const groupsMetaMap = new Map(
        availableAddonGroups.map((g) => [g.id, { name: g.name, sortOrder: g.sortOrder }])
      );
      const orderedAddonGroupIds = AddonOrganizationService.sortAddonGroupIds(
        selectedAddonGroupIds,
        groupsMetaMap
      );

      if (productToEdit) {
        result = await productService.updateProduct(
          productToEdit.id,
          {
            name: name.trim(),
            description: description.trim(),
            price: numPrice,
            servesText: servesText.trim() || null,
            category_id: categoryId,
            category: catName,
            cardBadgeId: finalCardBadgeId,
            addonGroupIds: orderedAddonGroupIds,
          },
          file || undefined
        );
      } else {
        result = await productService.createProduct(
          {
            name: name.trim(),
            description: description.trim(),
            price: numPrice,
            servesText: servesText.trim() || null,
            category_id: categoryId,
            category: catName,
            imageUrl: "",
            cardBadgeId: finalCardBadgeId,
            addonGroupIds: orderedAddonGroupIds,
          },
          file || undefined
        );
      }

      onSaved(result);
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar o produto.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenExistingCropper = () => {
    if (!previewUrl) return;
    setError("");
    setRawImageSrc(previewUrl);
    setCropModalOpen(true);
  };

  const handleRequestOpenChange = (nextOpen: boolean) => {
    if (cropModalOpen) return;
    if (!nextOpen && hasUnsavedChanges && !loading) {
      const confirmed = window.confirm(
        "Você tem alterações não salvas (como foto ou dados do produto). Deseja sair sem salvar?"
      );
      if (!confirmed) return;
    }
    onOpenChange(nextOpen);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleRequestOpenChange}>
        <DialogContent className="w-full max-w-3xl sm:max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-3xl p-0 bg-white dark:bg-[#1F0B22] border border-gray-200 dark:border-border/40 shadow-2xl text-foreground">
          {/* Barra Fixa Superior de Salvamento + Lembrete de Alterações */}
          <div className="sticky top-0 z-20 px-5 sm:px-7 py-3 pr-12 border-b border-gray-200/80 dark:border-border/40 bg-white/95 dark:bg-[#1F0B22]/95 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {hasUnsavedChanges ? (
              <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 font-semibold min-w-0">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="leading-snug">
                  Alterações não salvas — lembre-se de clicar em <strong>Salvar</strong> para gravar a foto e os dados.
                </span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground leading-snug">
                Edite os dados ou a foto abaixo e clique em <strong>{productToEdit ? "Salvar Alterações" : "Cadastrar Produto"}</strong> para gravar.
              </p>
            )}

            <Button
              type="submit"
              form="product-editor-form"
              size="sm"
              disabled={loading}
              className={`h-9 px-4 rounded-xl text-xs font-bold uppercase tracking-wider shrink-0 gap-1.5 shadow-sm cursor-pointer ${
                hasUnsavedChanges
                  ? "bg-gradient-to-r from-[#9306CF] to-[#940068] text-white shadow-primary/30"
                  : "bg-primary hover:bg-primary/90 text-white"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{productToEdit ? "Salvar Alterações" : "Salvar Produto"}</span>
                </>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-border/30">
            {/* Lado Esquerdo: Prévia em Tempo Real + Upload/Edição da Foto */}
            <div className="p-6 sm:p-8 bg-gray-50/70 dark:bg-background/80 flex flex-col justify-between gap-5">
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
                    {(selectedCategory?.name || productToEdit?.category) && (
                      <span className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-md truncate max-w-[150px] shadow-sm tracking-wide">
                        {selectedCategory?.name || productToEdit?.category}
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
                    {servesText.trim() && (
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-primary">
                        <Users className="w-3.5 h-3.5 shrink-0" />
                        <span>{servesText.trim()}</span>
                      </div>
                    )}
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

                {/* Foto do Produto com Editor Livre e Edição da Foto Atual */}
                <div className="space-y-2 mt-5 pt-5 border-t border-gray-200/70 dark:border-border/30">
                  <div className="flex justify-between items-center gap-2">
                    <Label htmlFor="image" className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                      Foto do Produto
                    </Label>
                    <span className="text-[10px] font-medium text-muted-foreground">
                      Recomendação: 1:1 Quadrado • até 10MB
                    </span>
                  </div>

                  <div className="relative border-2 border-dashed border-gray-200 dark:border-border/50 hover:border-primary dark:hover:border-primary bg-white/80 dark:bg-card/40 rounded-xl p-3 transition-colors flex items-center gap-3 cursor-pointer group">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary dark:text-muted-foreground flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      {file ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Upload className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground dark:text-foreground truncate">
                        {file ? file.name : (productToEdit?.imageUrl ? "Foto atual mantida (clique para trocar)" : "Clique para escolher a foto")}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        JPEG, PNG ou WebP • Conversão automática para WebP ao salvar.
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

                  {previewUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleOpenExistingCropper}
                      className="w-full h-9 rounded-xl text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/5 cursor-pointer"
                    >
                      <Crop className="w-3.5 h-3.5" />
                      <span>Editar / Recortar Imagem Atual</span>
                    </Button>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center mt-2">
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

              {productToEdit &&
                dependencyImpact &&
                (dependencyImpact.parentCombos.length > 0 ||
                  dependencyImpact.promotions.length > 0 ||
                  dependencyImpact.coupons.length > 0) && (
                  <div className="mb-4 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/70 dark:bg-amber-950/30 px-3.5 py-2.5 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Vínculos ativos no catálogo</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      {dependencyImpact.parentCombos.length > 0 && (
                        <>
                          Participa de <strong>{dependencyImpact.parentCombos.length}</strong> combo(s) (
                          {dependencyImpact.parentCombos.map((c) => c.name).join(", ")}).{" "}
                        </>
                      )}
                      {dependencyImpact.promotions.length > 0 && (
                        <>
                          Possui <strong>{dependencyImpact.promotions.length}</strong> promoção(ões) vinculada(s) (preço abaixo do valor promocional fixo pausa a promoção automaticamente).{" "}
                        </>
                      )}
                      {dependencyImpact.coupons.length > 0 && (
                        <>
                          Restrito em <strong>{dependencyImpact.coupons.length}</strong> cupom(ns) (
                          {dependencyImpact.coupons.map((c) => c.code).join(", ")}).
                        </>
                      )}
                    </p>
                  </div>
                )}

              <form id="product-editor-form" onSubmit={handleSubmit} className="space-y-4">
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

                {/* Categoria (Linha Própria, Confortável e Visível) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label
                      htmlFor="category-select"
                      className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300"
                    >
                      Categoria
                    </Label>
                    <span className="text-[10px] font-semibold text-primary dark:text-muted-foreground">
                      obrigatório
                    </span>
                  </div>
                  <div className="relative">
                    <select
                      id="category-select"
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      required
                      className="w-full h-11 pl-3.5 pr-10 rounded-xl bg-white border border-gray-200 text-gray-900 dark:bg-card dark:border-border/50 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer"
                    >
                      <option value="" disabled>
                        Selecione uma categoria...
                      </option>
                      {activeCategories.map((cat) => (
                        <option
                          key={cat.id}
                          value={cat.id}
                          className="py-1 text-gray-900 dark:text-white bg-white dark:bg-[#1F0B22]"
                        >
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Preço de Venda (R$) */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="price"
                    className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300"
                  >
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
                      className="h-11 rounded-xl bg-white border-gray-200 text-gray-900 dark:bg-card dark:border-border/50 dark:text-white pl-10 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary font-semibold text-sm"
                      placeholder="0,00"
                    />
                  </div>
                </div>

                {/* Rendimento / Serve X Pessoas */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label
                      htmlFor="serves-text"
                      className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 flex items-center gap-1.5"
                    >
                      <Users className="w-3.5 h-3.5 text-primary" />
                      Rendimento / &quot;Serve X Pessoas&quot;
                    </Label>
                    <span className="text-[10px] text-muted-foreground font-normal">
                      opcional
                    </span>
                  </div>
                  <Input
                    id="serves-text"
                    type="text"
                    value={servesText}
                    onChange={(e) => setServesText(e.target.value)}
                    className="h-11 rounded-xl bg-white border-gray-200 text-gray-900 dark:bg-card dark:border-border/50 dark:text-white text-sm"
                    placeholder="Ex: Serve 1 a 2 pessoas"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {["Serve 1 pessoa", "Serve 1 a 2 pessoas", "Serve 2 pessoas", "Serve 2 a 3 pessoas", "Serve 3 a 4 pessoas"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setServesText(opt)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all font-medium ${
                          servesText === opt
                            ? "bg-primary text-white border-primary shadow-xs"
                            : "bg-gray-50 dark:bg-card border-gray-200 dark:border-border/50 text-gray-700 dark:text-gray-300 hover:border-primary/50"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
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

                {/* Seção Complementos & Modificadores */}
                <div className="space-y-2.5 pt-2 border-t border-gray-100 dark:border-border/40">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <IceCream className="w-4 h-4 text-primary dark:text-violet-400 shrink-0" />
                      <span>Complementos & Modificadores</span>
                    </Label>
                    <span className="text-[11px] font-semibold text-muted-foreground shrink-0 whitespace-nowrap">
                      {selectedAddonGroupIds.length} selecionado(s)
                    </span>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Marque os grupos de complementos pertinentes a este produto. Grupos de talheres e descartáveis são posicionados automaticamente ao final.
                  </p>

                  {availableAddonGroups.length === 0 ? (
                    <div className="p-3 text-center rounded-xl bg-gray-50 dark:bg-card/40 border border-dashed border-border/60 text-xs text-muted-foreground">
                      Nenhum grupo de complementos ativo cadastrado na aba &quot;Complementos&quot;.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                      {availableAddonGroups.map((group) => {
                        const isChecked = selectedAddonGroupIds.includes(group.id);
                        const freeText = group.freeQuantity > 0 ? `Até ${group.freeQuantity} grátis` : "Sem itens grátis";
                        const reqText = group.isRequired ? "Obrigatório" : "Opcional";
                        const isCutlery = AddonOrganizationService.isCutleryGroupName(group.name);
                        const itemsPreview = (group.items || [])
                          .slice(0, 4)
                          .map((item) => item.name)
                          .join(", ");

                        return (
                          <label
                            key={group.id}
                            className={`flex items-start gap-2.5 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                              isChecked
                                ? "bg-primary/5 dark:bg-primary/10 border-primary/40 shadow-2xs"
                                : "bg-white dark:bg-card/40 border-gray-200 dark:border-border/50 hover:border-gray-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const groupsMeta = new Map(
                                  availableAddonGroups.map((g) => [g.id, { name: g.name, sortOrder: g.sortOrder }])
                                );
                                if (e.target.checked) {
                                  setSelectedAddonGroupIds((prev) =>
                                    AddonOrganizationService.sortAddonGroupIds([...prev, group.id], groupsMeta)
                                  );
                                } else {
                                  setSelectedAddonGroupIds((prev) => prev.filter((id) => id !== group.id));
                                }
                              }}
                              className="mt-0.5 w-4 h-4 accent-primary rounded cursor-pointer shrink-0"
                            />
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex items-start justify-between gap-2 flex-wrap">
                                <p className="text-xs sm:text-[13px] font-bold text-foreground leading-snug break-words">
                                  {group.name}
                                </p>
                                {isCutlery && (
                                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shrink-0">
                                    Final
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground leading-snug">
                                {group.items?.length || 0} opções • {reqText} • {freeText}
                              </p>
                              {itemsPreview && (
                                <p className="text-[10px] text-muted-foreground/85 leading-snug break-words">
                                  Itens: {itemsPreview}
                                  {(group.items?.length || 0) > 4 ? "..." : ""}
                                </p>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
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
