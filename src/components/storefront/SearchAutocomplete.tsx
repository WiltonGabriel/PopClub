"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search, X, ArrowRight, ShoppingBag, Check, IceCream } from "lucide-react";
import { Product } from "../../services/productService";
import { useCart } from "../../hooks/useCart";
import { useToast } from "../ui/ToastNotification";

interface SearchAutocompleteProps {
  products: Product[];
  initialValue?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  onSelectProduct?: (product: Product) => void;
  onNavigateToResults?: (query: string) => void;
  autoFocus?: boolean;
}

export function SearchAutocomplete({
  products,
  initialValue = "",
  placeholder = "Buscar açaí puro batido na hora, pop shakes, coberturas...",
  className = "",
  inputClassName = "",
  onSelectProduct,
  onNavigateToResults,
  autoFocus = false,
}: SearchAutocompleteProps) {
  const [query, setQuery] = useState(initialValue);
  const [debouncedQuery, setDebouncedQuery] = useState(initialValue);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { addItem } = useCart();
  const { showToast } = useToast();

  // Sincroniza initialValue se mudar externamente
  useEffect(() => {
    setQuery(initialValue);
    setDebouncedQuery(initialValue);
  }, [initialValue]);

  // Debounce de 300ms conforme o usuário digita
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(handler);
  }, [query]);

  // Filtra até 5 produtos mais relevantes
  const matchedProducts = React.useMemo(() => {
    const cleanQ = debouncedQuery.trim().toLowerCase();
    if (cleanQ.length < 2) return [];

    return products
      .filter((p) => {
        const nameMatch = p.name.toLowerCase().includes(cleanQ);
        const descMatch = (p.description || "").toLowerCase().includes(cleanQ);
        const catMatch = (p.category || "").toLowerCase().includes(cleanQ);
        return nameMatch || descMatch || catMatch;
      })
      .sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(cleanQ);
        const bStarts = b.name.toLowerCase().startsWith(cleanQ);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return 0;
      })
      .slice(0, 5);
  }, [debouncedQuery, products]);

  // Controla abertura do dropdown
  useEffect(() => {
    if (debouncedQuery.trim().length >= 2 && matchedProducts.length > 0) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
    setSelectedIndex(-1);
  }, [debouncedQuery, matchedProducts.length]);

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNavigateToSearch = useCallback(
    (searchQuery: string) => {
      const q = searchQuery.trim();
      if (!q) return;
      setIsOpen(false);
      inputRef.current?.blur();
      if (onNavigateToResults) {
        onNavigateToResults(q);
      } else {
        router.push(`/busca?q=${encodeURIComponent(q)}`);
      }
    },
    [router, onNavigateToResults]
  );

  // Navegação por teclado
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen && debouncedQuery.trim().length >= 2) {
        setIsOpen(true);
        return;
      }
      setSelectedIndex((prev) => (prev < matchedProducts.length - 1 ? prev + 1 : 0));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : matchedProducts.length - 1));
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < matchedProducts.length) {
        handleQuickAction(matchedProducts[selectedIndex]);
      } else {
        handleNavigateToSearch(query);
      }
    }
  };

  const handleQuickAction = (product: Product) => {
    if (onSelectProduct) {
      onSelectProduct(product);
      setIsOpen(false);
      return;
    }

    // Adiciona ao carrinho por padrão com micro-feedback visual
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.price,
      quantity: 1,
      imageUrl: product.imageUrl,
    });

    setAddedProductId(product.id);
    setTimeout(() => setAddedProductId(null), 1500);

    showToast({
      title: "Adicionado ao Carrinho! 🛍️",
      message: `${product.name} foi colocado no seu pedido.`,
      type: "success",
    });
    setIsOpen(false);
  };

  // Realce do termo pesquisado no nome do produto
  const highlightMatch = (text: string, searchWord: string) => {
    if (!searchWord || searchWord.trim().length < 1) return text;
    const cleanWord = searchWord.trim();
    const index = text.toLowerCase().indexOf(cleanWord.toLowerCase());
    if (index === -1) return text;

    const before = text.substring(0, index);
    const match = text.substring(index, index + cleanWord.length);
    const after = text.substring(index + cleanWord.length);

    return (
      <>
        {before}
        <span className="font-black text-[#9306CF] dark:text-[#C7A9C9] underline decoration-[#9306CF]/40">
          {match}
        </span>
        {after}
      </>
    );
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Campo de Input com Ícones */}
      <div className="relative w-full flex items-center">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="search"
          autoFocus={autoFocus}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (debouncedQuery.trim().length >= 2 && matchedProducts.length > 0) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`
            w-full bg-muted border border-border/50 rounded-full
            pl-10 pr-10 py-2.5
            text-sm text-foreground placeholder:text-muted-foreground
            outline-none
            focus:ring-2 focus:ring-brand-pop-shake/30
            focus:border-brand-pop-shake/50
            transition-all shadow-xs
            ${inputClassName}
          `}
        />

        {/* Botão para Limpar Busca */}
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setDebouncedQuery("");
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-full transition-colors cursor-pointer"
            title="Limpar busca"
            aria-label="Limpar campo de pesquisa"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown Flutuante de Autocomplete */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 w-full bg-white dark:bg-[#230E26] shadow-2xl rounded-2xl border border-purple-100 dark:border-purple-900/40 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-2 border-b border-gray-100 dark:border-[#512B54]/30 bg-gray-50/70 dark:bg-[#1A0B1C]/60 flex items-center justify-between px-3.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Sugestões Rápidas ({matchedProducts.length})
            </span>
            <span className="text-[10px] text-gray-400 font-mono hidden sm:inline">
              Pressione Enter para ver todos
            </span>
          </div>

          {/* Lista de Resultados Rápidos */}
          <div className="divide-y divide-gray-100 dark:divide-[#512B54]/30 max-h-80 overflow-y-auto">
            {matchedProducts.map((product, idx) => {
              const isSelected = selectedIndex === idx;
              const isJustAdded = addedProductId === product.id;

              return (
                <div
                  key={product.id}
                  onClick={() => handleQuickAction(product)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`
                    p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors
                    ${
                      isSelected
                        ? "bg-[#9306CF]/10 dark:bg-[#9306CF]/20"
                        : "hover:bg-gray-50 dark:hover:bg-white/5"
                    }
                  `}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Foto ou Placeholder */}
                    <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-[#1A0B1C] border border-gray-200 dark:border-[#512B54]/40 shrink-0 overflow-hidden flex items-center justify-center relative">
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <IceCream className="w-5 h-5 text-[#9306CF]/50" />
                      )}
                    </div>

                    {/* Nome, Categoria e Detalhes */}
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-[#4C264F] dark:text-[#F9F5F9] truncate">
                        {highlightMatch(product.name, debouncedQuery)}
                      </p>
                      {product.category && (
                        <span className="inline-block text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40 px-1.5 py-0.2 rounded mt-0.5">
                          {product.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Preço e Botão Rápido de Adicionar */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="font-mono font-bold text-sm text-[#35A340]">
                      R$ {product.price.toFixed(2).replace(".", ",")}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickAction(product);
                      }}
                      className={`
                        w-8 h-8 rounded-xl flex items-center justify-center transition-all shadow-xs
                        ${
                          isJustAdded
                            ? "bg-emerald-500 text-white"
                            : "bg-[#9306CF]/10 hover:bg-[#9306CF] text-[#9306CF] hover:text-white"
                        }
                      `}
                      title="Adicionar ao carrinho"
                    >
                      {isJustAdded ? (
                        <Check className="w-4 h-4 animate-in zoom-in" />
                      ) : (
                        <ShoppingBag className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rodapé com Link para a Página Completa de Busca */}
          <div className="p-3 bg-gray-50 dark:bg-[#1A0B1C]/90 border-t border-gray-100 dark:border-[#512B54]/30">
            <button
              type="button"
              onClick={() => handleNavigateToSearch(query)}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-95 text-white font-heading text-xs font-bold uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Ver todos os resultados para &ldquo;{query}&rdquo;</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
