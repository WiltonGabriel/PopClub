"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

export interface Address {
  id: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  complement?: string;
  reference?: string;
  zip?: string;
  label?: "Casa" | "Trabalho" | "Outro" | string;
  latitude?: number;
  longitude?: number;
  createdAt: number;
}

interface AddressContextType {
  addresses: Address[];
  activeAddress: Address | null;
  activeAddressId: string | null;
  isAddressModalOpen: boolean;
  openAddressModal: () => void;
  closeAddressModal: () => void;
  setActiveAddressId: (id: string) => void;
  saveAddress: (addressData: Omit<Address, "id" | "createdAt">, idToUpdate?: string) => Address;
  deleteAddress: (id: string) => void;
  updateActiveAddressFields: (fields: Partial<Omit<Address, "id" | "createdAt">>) => void;
  headerAddressLabel: string;
  fullAddressText: string;
}

const AddressContext = createContext<AddressContextType | undefined>(undefined);

const STORAGE_KEY_ADDRESSES = "popshake_addresses";
const STORAGE_KEY_ACTIVE = "popshake_active_address";

export function AddressProvider({ children }: { children: React.ReactNode }) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [activeAddressId, setActiveAddressIdState] = useState<string | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);

  // Carrega do localStorage no cliente
  useEffect(() => {
    try {
      const savedAddressesRaw = localStorage.getItem(STORAGE_KEY_ADDRESSES);
      const savedActiveRaw = localStorage.getItem(STORAGE_KEY_ACTIVE);

      let loadedAddresses: Address[] = [];
      if (savedAddressesRaw) {
        const parsed = JSON.parse(savedAddressesRaw);
        if (Array.isArray(parsed)) {
          loadedAddresses = parsed;
          setAddresses(loadedAddresses);
        }
      }

      if (savedActiveRaw && loadedAddresses.some((a) => a.id === savedActiveRaw)) {
        setActiveAddressIdState(savedActiveRaw);
      } else if (loadedAddresses.length > 0) {
        setActiveAddressIdState(loadedAddresses[0].id);
        try {
          localStorage.setItem(STORAGE_KEY_ACTIVE, loadedAddresses[0].id);
        } catch {}
      }
    } catch (err) {
      console.warn("Erro ao carregar endereços do localStorage:", err);
    } finally {
      setHasHydrated(true);
    }
  }, []);

  const activeAddress = useMemo(() => {
    if (!activeAddressId || addresses.length === 0) return null;
    return addresses.find((a) => a.id === activeAddressId) || null;
  }, [activeAddressId, addresses]);

  const openAddressModal = useCallback(() => {
    setIsAddressModalOpen(true);
  }, []);

  const closeAddressModal = useCallback(() => {
    setIsAddressModalOpen(false);
  }, []);

  const setActiveAddressId = useCallback((id: string) => {
    setActiveAddressIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE, id);
    } catch (err) {
      console.error("Erro ao salvar endereço ativo:", err);
    }
  }, []);

  const saveAddress = useCallback(
    (addressData: Omit<Address, "id" | "createdAt">, idToUpdate?: string): Address => {
      let savedAddr: Address;

      setAddresses((prev) => {
        let next: Address[];

        if (idToUpdate && prev.some((a) => a.id === idToUpdate)) {
          next = prev.map((a) => {
            if (a.id === idToUpdate) {
              savedAddr = {
                ...a,
                ...addressData,
              };
              return savedAddr;
            }
            return a;
          });
        } else {
          const newId =
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `addr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

          savedAddr = {
            ...addressData,
            id: newId,
            createdAt: Date.now(),
          };
          next = [savedAddr, ...prev];
        }

        try {
          localStorage.setItem(STORAGE_KEY_ADDRESSES, JSON.stringify(next));
          localStorage.setItem(STORAGE_KEY_ACTIVE, savedAddr.id);
        } catch (err) {
          console.error("Erro ao persistir endereços:", err);
        }

        return next;
      });

      setActiveAddressIdState(savedAddr!.id);
      return savedAddr!;
    },
    []
  );

  const deleteAddress = useCallback(
    (id: string) => {
      setAddresses((prev) => {
        const next = prev.filter((a) => a.id !== id);
        try {
          localStorage.setItem(STORAGE_KEY_ADDRESSES, JSON.stringify(next));
        } catch (err) {
          console.error("Erro ao remover endereço do storage:", err);
        }

        if (activeAddressId === id) {
          const nextActive = next.length > 0 ? next[0].id : null;
          setActiveAddressIdState(nextActive);
          try {
            if (nextActive) {
              localStorage.setItem(STORAGE_KEY_ACTIVE, nextActive);
            } else {
              localStorage.removeItem(STORAGE_KEY_ACTIVE);
            }
          } catch {}
        }

        return next;
      });
    },
    [activeAddressId]
  );

  const updateActiveAddressFields = useCallback(
    (fields: Partial<Omit<Address, "id" | "createdAt">>) => {
      setAddresses((prev) => {
        if (!activeAddressId || !prev.some((a) => a.id === activeAddressId)) {
          // Se não houver ativo, cria um novo endereço dinâmico
          const newId =
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `addr_${Date.now()}`;
          const newAddr: Address = {
            id: newId,
            street: fields.street || "",
            number: fields.number || "",
            neighborhood: fields.neighborhood || "",
            city: fields.city || "Local",
            complement: fields.complement || "",
            reference: fields.reference || "",
            zip: fields.zip || "",
            label: fields.label || "Casa",
            latitude: fields.latitude,
            longitude: fields.longitude,
            createdAt: Date.now(),
          };
          const next = [newAddr, ...prev];
          setActiveAddressIdState(newId);
          try {
            localStorage.setItem(STORAGE_KEY_ADDRESSES, JSON.stringify(next));
            localStorage.setItem(STORAGE_KEY_ACTIVE, newId);
          } catch {}
          return next;
        }

        const next = prev.map((a) => {
          if (a.id === activeAddressId) {
            return {
              ...a,
              ...fields,
            };
          }
          return a;
        });

        try {
          localStorage.setItem(STORAGE_KEY_ADDRESSES, JSON.stringify(next));
        } catch {}

        return next;
      });
    },
    [activeAddressId]
  );

  const headerAddressLabel = useMemo(() => {
    if (!hasHydrated || !activeAddress || !activeAddress.street.trim()) {
      return "Adicionar endereço";
    }
    const street = activeAddress.street.trim();
    const num = activeAddress.number?.trim();
    if (num) {
      return `${street}, ${num}`;
    }
    return street;
  }, [hasHydrated, activeAddress]);

  const fullAddressText = useMemo(() => {
    if (!hasHydrated || !activeAddress || !activeAddress.street.trim()) {
      return "Nenhum endereço de entrega selecionado. Clique para adicionar.";
    }
    const parts: string[] = [];
    if (activeAddress.street) {
      parts.push(
        activeAddress.number
          ? `${activeAddress.street}, ${activeAddress.number}`
          : activeAddress.street
      );
    }
    if (activeAddress.complement) {
      parts.push(`(${activeAddress.complement})`);
    }
    if (activeAddress.neighborhood) {
      parts.push(`Bairro ${activeAddress.neighborhood}`);
    }
    if (activeAddress.city) {
      parts.push(activeAddress.city);
    }
    if (activeAddress.zip) {
      parts.push(`CEP ${activeAddress.zip}`);
    }
    if (activeAddress.reference) {
      parts.push(`Ref: ${activeAddress.reference}`);
    }
    return parts.join(" - ");
  }, [hasHydrated, activeAddress]);

  return (
    <AddressContext.Provider
      value={{
        addresses,
        activeAddress,
        activeAddressId,
        isAddressModalOpen,
        openAddressModal,
        closeAddressModal,
        setActiveAddressId,
        saveAddress,
        deleteAddress,
        updateActiveAddressFields,
        headerAddressLabel,
        fullAddressText,
      }}
    >
      {children}
    </AddressContext.Provider>
  );
}

export function useAddress() {
  const context = useContext(AddressContext);
  if (!context) {
    throw new Error("useAddress deve ser usado dentro de um AddressProvider");
  }
  return context;
}
