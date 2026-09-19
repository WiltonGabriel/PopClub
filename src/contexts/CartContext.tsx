"use client";

import React, { createContext, useState, useEffect, ReactNode } from "react";

export interface SelectedOption {
  groupName: string;
  name: string;
  price: number;
}

export interface CartItem {
  id: string; // único no carrinho: `${productId}-${promotionId || 'regular'}-${optionsKey}-${notesKey}`
  productId: string;
  name: string;
  price: number; // preço unitário com eventual desconto e adicionais
  originalPrice: number;
  quantity: number;
  imageUrl?: string;
  promotionId?: string | null;
  promotionTitle?: string | null;
  selectedOptions?: SelectedOption[];
  notes?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "id"> & { id?: string }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  discountTotal: number;
  itemsTotal: number;
  isLoaded: boolean;
}

export const CartContext = createContext<CartContextType>({
  items: [],
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  totalItems: 0,
  subtotal: 0,
  discountTotal: 0,
  itemsTotal: 0,
  isLoaded: false,
});

const STORAGE_KEY = "popclub_cart_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Carrega do localStorage no client
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Erro ao carregar carrinho:", e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Salva no localStorage quando mudar
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch (e) {
        console.error("Erro ao salvar carrinho:", e);
      }
    }
  }, [items, isLoaded]);

  // Escuta evento global de signout para esvaziar carrinho
  useEffect(() => {
    const handleSignOut = () => {
      setItems([]);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    };
    window.addEventListener("popshake:signout", handleSignOut);
    return () => window.removeEventListener("popshake:signout", handleSignOut);
  }, []);

  const addItem = (newItem: Omit<CartItem, "id"> & { id?: string }) => {
    const optionsKey =
      newItem.selectedOptions && newItem.selectedOptions.length > 0
        ? newItem.selectedOptions.map((o) => `${o.groupName}:${o.name}`).sort().join("|")
        : "base";
    const notesKey = (newItem.notes || "").trim().toLowerCase();
    const id =
      newItem.id ||
      `${newItem.productId}-${newItem.promotionId || "regular"}-${optionsKey}-${notesKey}`;

    setItems((prev) => {
      const existing = prev.find((i) => i.id === id);
      if (existing) {
        return prev.map((i) =>
          i.id === id ? { ...i, quantity: i.quantity + (newItem.quantity || 1) } : i
        );
      }
      return [...prev, { ...newItem, id, quantity: newItem.quantity || 1 }];
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null)
    );
  };

  const clearCart = () => {
    setItems([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const subtotal = items.reduce(
    (sum, item) => sum + (item.originalPrice || item.price) * item.quantity,
    0
  );

  const itemsTotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const discountTotal = Math.max(0, subtotal - itemsTotal);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal: Number(subtotal.toFixed(2)),
        discountTotal: Number(discountTotal.toFixed(2)),
        itemsTotal: Number(itemsTotal.toFixed(2)),
        isLoaded,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
