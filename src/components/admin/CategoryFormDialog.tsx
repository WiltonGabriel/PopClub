"use client";

import { useState, useEffect, useRef } from "react";
import { categoryService, Category } from "../../services/categoryService";
import { productService } from "../../services/productService";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import {
  Loader2,
  Upload,
  X,
  Image as ImageIcon,
  Sparkles,
  Zap,
  Tag,
  Users,
  Clock,
  Layers,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import { parseCategoryEmojiAndName } from "../storefront/CategoryChip";
import { ImageCropperDialog } from "./ImageCropperDialog";

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (category: Category) => void;
  categoryToEdit?: Category | null;
}

const POPULAR_EMOJIS = [
  "🫐", "🍇", "🍦", "🥤", "⚡", "🍴", "🍓", "🔥", "✨",
  "🍫", "🥥", "🍧", "🥣", "⭐", "🍒", "🍨", "🍪", "👥", "⏰",
];

const DYNAMIC_RULES = [
  {
    type: "HIGHLIGHTS",
    title: "⭐ Mais Vendidos / Destaques",
    desc: "Exibe produtos marcados como destaque ou com alto apelo comercial.",
    icon: Sparkles,
    defaultEmoji: "⭐",
    defaultName: "Destaques & Mais Pedidos",
  },
  {
    type: "ACTIVE_PROMOTIONS",
    title: "🔥 Ofertas & Promoções Ativas",
    desc: "Exibe automaticamente os itens com descontos e promoções vigentes.",
    icon: Tag,
    defaultEmoji: "🔥",
    defaultName: "Ofertas Especiais",
  },
  {
    type: "COMBOS",
    title: "⚡ Combos & Bundles",
    desc: "Agrupa kits de produtos, combos promocionais e pacotes da casa.",
    icon: Zap,
    defaultEmoji: "⚡",
    defaultName: "Combos & Kits",
  },
  {
    type: "SHAREABLE",
    title: "👥 Para Compartilhar",
    desc: "Filtra produtos cujo rendimento serve 2 ou mais pessoas (potes, roletas).",
    icon: Users,
    defaultEmoji: "👥",
    defaultName: "Para Compartilhar",
  },
  {
    type: "TIME_BASED",
    title: "⏰ Ofertas por Horário / Turno",
    desc: "Ativa e exibe a categoria apenas na janela de horário definida pelo lojista.",
    icon: Clock,
    defaultEmoji: "⏰",
    defaultName: "Menu do Turno",
  },
] as const;

export function CategoryFormDialog({
  open,
  onOpenChange,
  onSaved,
  categoryToEdit,
}: CategoryFormDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Modo dinâmico
  const [isDynamic, setIsDynamic] = useState(false);
  const [dynamicType, setDynamicType] = useState<string>("HIGHLIGHTS");
  const [timeStart, setTimeStart] = useState("14:00");
  const [timeEnd, setTimeEnd] = useState("18:00");

  // Status de ativação
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Sincroniza dados sempre que abrir o modal ou mudar a categoria selecionada
  useEffect(() => {
    if (open) {
      if (categoryToEdit) {
        setName(categoryToEdit.name || "");
        setDescription(categoryToEdit.description || "");
        setImageUrl(categoryToEdit.imageUrl || "");
        setIsActive(categoryToEdit.isActive ?? true);
        setIsDynamic(Boolean(categoryToEdit.isDynamic));
        setDynamicType(categoryToEdit.dynamicType || "HIGHLIGHTS");
        setTimeStart(categoryToEdit.timeStart || "14:00");
        setTimeEnd(categoryToEdit.timeEnd || "18:00");
      } else {
        setName("");
        setDescription("");
        setImageUrl("");
        setIsActive(true);
        setIsDynamic(false);
        setDynamicType("HIGHLIGHTS");
        setTimeStart("14:00");
        setTimeEnd("18:00");
      }
      setImageFile(null);
      setRawImageSrc(null);
      setCropModalOpen(false);
      setError("");
    }
  }, [open, categoryToEdit]);

  const handleSelectEmoji = (emoji: string) => {
    const parsed = parseCategoryEmojiAndName(name);
    if (parsed.emoji && parsed.cleanName) {
      setName(`${emoji} ${parsed.cleanName}`);
    } else if (name.trim()) {
      setName(`${emoji} ${name.trim()}`);
    } else {
      setName(`${emoji} `);
    }
  };

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
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Por favor, digite o nome da categoria.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let finalImageUrl: string | null = imageUrl || null;
      if (imageFile) {
        finalImageUrl = await productService.uploadImage(imageFile, "category");
      }

      const payload: Partial<Category> = {
        name: trimmedName,
        description: description.trim().slice(0, 100) || null,
        imageUrl: finalImageUrl,
        isActive,
        isDynamic,
        dynamicType: isDynamic ? dynamicType : null,
        timeStart: isDynamic && dynamicType === "TIME_BASED" ? timeStart : null,
        timeEnd: isDynamic && dynamicType === "TIME_BASED" ? timeEnd : null,
      };

      let result: Category;
      if (categoryToEdit) {
        result = await categoryService.updateCategory(categoryToEdit.id, payload);
      } else {
        result = await categoryService.createCategory(payload);
      }

      onSaved(result);
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar a categoria.");
    } finally {
      setLoading(false);
    }
  };

  const parsedPreview = parseCategoryEmojiAndName(name || "Nova Categoria");

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg w-full rounded-3xl bg-white dark:bg-[#1A0A1C] text-foreground border border-gray-200 dark:border-border/40 shadow-2xl p-6 max-h-[92vh] overflow-y-auto">
          <DialogHeader className="mb-2">
            <DialogTitle className="font-heading text-xl font-bold text-foreground flex items-center justify-between">
              <span>{categoryToEdit ? "Editar Categoria" : "Nova Categoria"}</span>
              {categoryToEdit && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                  {categoryToEdit.productCount ?? categoryToEdit._count?.products ?? 0} produtos
                </span>
              )}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Configure o título, descrição, ícone e regras de exibição na vitrine.
            </p>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {/* 1. SELETOR DE MODO: MANUAL OU DINÂMICA */}
            <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-primary" />
                    Tipo de Categoria
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {isDynamic
                      ? "Os produtos são inseridos automaticamente pelo algoritmo do sistema."
                      : "Você vincula manualmente os produtos pelo formulário de cada item."}
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <button
                    type="button"
                    onClick={() => setIsDynamic(false)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      !isDynamic
                        ? "bg-primary text-white shadow-xs"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                    }`}
                  >
                    Manual
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDynamic(true);
                      if (!name.trim()) {
                        const rule = DYNAMIC_RULES.find((r) => r.type === dynamicType);
                        if (rule) {
                          setName(`${rule.defaultEmoji} ${rule.defaultName}`);
                        }
                      }
                    }}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      isDynamic
                        ? "bg-primary text-white shadow-xs"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                    }`}
                  >
                    Dinâmica
                  </button>
                </div>
              </div>

              {/* SELETOR DE REGRA DINÂMICA */}
              {isDynamic && (
                <div className="space-y-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800 animate-in fade-in duration-200">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-primary block">
                    Regra Automática da Categoria
                  </Label>
                  <div className="grid grid-cols-1 gap-2">
                    {DYNAMIC_RULES.map((rule) => {
                      const Icon = rule.icon;
                      const isSelected = dynamicType === rule.type;
                      return (
                        <div
                          key={rule.type}
                          onClick={() => {
                            setDynamicType(rule.type);
                            if (!categoryToEdit && (!name.trim() || DYNAMIC_RULES.some((r) => name.includes(r.defaultName)))) {
                              setName(`${rule.defaultEmoji} ${rule.defaultName}`);
                            }
                          }}
                          className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-3 ${
                            isSelected
                              ? "bg-primary/5 dark:bg-primary/20 border-primary shadow-xs ring-1 ring-primary/30"
                              : "bg-white dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700/80 hover:border-zinc-300"
                          }`}
                        >
                          <div
                            className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                              isSelected
                                ? "bg-primary text-white"
                                : "bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-foreground">
                                {rule.title}
                              </span>
                              {isSelected && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {rule.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Configuração de Horário se for TIME_BASED */}
                  {dynamicType === "TIME_BASED" && (
                    <div className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 mt-2 space-y-2">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3 text-primary" /> Janela de Exibição na Vitrine
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-muted-foreground font-semibold">Início:</span>
                          <Input
                            type="time"
                            value={timeStart}
                            onChange={(e) => setTimeStart(e.target.value)}
                            className="h-9 text-xs font-mono rounded-lg"
                            required
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground font-semibold">Término:</span>
                          <Input
                            type="time"
                            value={timeEnd}
                            onChange={(e) => setTimeEnd(e.target.value)}
                            className="h-9 text-xs font-mono rounded-lg"
                            required
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        A categoria só ficará visível para os clientes durante este intervalo de horário.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. TÍTULO DA CATEGORIA (TEXTO LIVRE + SUPORTE A EMOJIS) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="cat-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Título da Categoria
                </Label>
                <span className="text-[10px] text-muted-foreground">Emojis permitidos diretamente no nome</span>
              </div>
              <Input
                id="cat-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 rounded-xl bg-white border-gray-200 text-foreground dark:bg-card dark:border-border/50 text-sm focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary font-medium"
                placeholder="Ex: 🫐 Açaí Tradicional, ⚡ Combos da Casa..."
                required
              />

              {/* Sugestões de Emojis Rápidos para Inserir */}
              <div className="flex flex-wrap items-center gap-1 pt-1">
                <span className="text-[10px] text-muted-foreground mr-1">Inserir emoji:</span>
                {POPULAR_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleSelectEmoji(emoji)}
                    className="w-6 h-6 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 flex items-center justify-center text-xs transition-colors cursor-pointer"
                    title={`Inserir ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. DESCRIÇÃO CURTA (COM CONTADOR VISUAL RÍGIDO MÁX 100 CARACTERES) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="cat-desc" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Descrição Curta (Opcional)
                </Label>
                <span
                  className={`text-[10px] font-mono font-bold ${
                    description.length >= 95
                      ? "text-red-500"
                      : description.length >= 80
                      ? "text-amber-500"
                      : "text-muted-foreground"
                  }`}
                >
                  {description.length}/100
                </span>
              </div>
              <Input
                id="cat-desc"
                value={description}
                maxLength={100}
                onChange={(e) => setDescription(e.target.value)}
                className="h-10 rounded-xl bg-white border-gray-200 text-foreground dark:bg-card dark:border-border/50 text-xs focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary"
                placeholder="Ex: Cremoso, batido na hora com ingredientes frescos e selecionados."
              />
              <p className="text-[10px] text-muted-foreground">
                Exibida em detalhes e cards de produtos como texto de apoio da seção.
              </p>
            </div>

            {/* 4. ÍCONE / IMAGEM PRÓPRIA (WebP, SVG, PNG) */}
            <div className="space-y-2 p-3 rounded-2xl bg-zinc-50 dark:bg-card/50 border border-zinc-200/80 dark:border-border/30">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-primary" />
                  Ícone / Imagem Própria
                </Label>
                <span className="text-[10px] text-primary font-semibold">Proporção 1:1 (WebP, SVG, PNG)</span>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <div className="w-12 h-12 rounded-xl bg-white dark:bg-card border border-border overflow-hidden shrink-0 flex items-center justify-center p-1 shadow-2xs">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt="Ícone" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-xl">{parsedPreview.emoji || "🍧"}</span>
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
                      <span>{imageUrl ? "Alterar Foto" : "Subir Foto / SVG"}</span>
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
                        Usar Emoji
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {imageUrl
                      ? "A foto customizada será exibida ao lado do título."
                      : "Sem imagem própria enviada. O emoji do título será exibido como ícone."}
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

            {/* 5. SWITCH ATIVO / INATIVO */}
            <div className="p-3 bg-zinc-50 dark:bg-card/50 rounded-2xl border border-zinc-200/80 dark:border-border/30 flex items-center justify-between">
              <div>
                <Label htmlFor="cat-active" className="text-xs font-bold uppercase tracking-wider text-foreground block cursor-pointer">
                  Exibir Categoria na Vitrine
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  {isActive
                    ? "Categoria ativa e visível no cardápio dos clientes."
                    : "Categoria pausada/oculta temporariamente na vitrine."}
                </p>
              </div>
              <Switch
                id="cat-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>

            {/* PRÉVIA INSTANTÂNEA NA ESTEIRA */}
            <div className="p-3 bg-zinc-100/70 dark:bg-white/[0.03] rounded-2xl border border-zinc-200 dark:border-border/30 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-muted-foreground block">
                  Prévia na Esteira da Vitrine:
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {isDynamic ? "Categoria Dinâmica Automática" : "Categoria Tradicional"}
                </span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-primary text-white shadow-xs max-w-[220px]">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt="" className="w-5 h-5 object-contain rounded-md shrink-0 bg-white/10" />
                ) : (
                  <span className="text-sm leading-none shrink-0">{parsedPreview.emoji}</span>
                )}
                <span className="text-xs font-semibold whitespace-nowrap truncate">
                  {parsedPreview.cleanName || "Categoria"}
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
                "Salvar Alterações"
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
