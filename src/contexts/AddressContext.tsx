"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { userService, UserLocation } from "@/services/userService";

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
  editingAddress: Address | null;
  openAddressModal: (addressToEdit?: Address | null | unknown) => void;
  closeAddressModal: () => void;
  setActiveAddressId: (id: string) => void;
  saveAddress: (addressData: Omit<Address, "id" | "createdAt">, idToUpdate?: string) => Promise<Address> | Address;
  deleteAddress: (id: string) => Promise<void> | void;
  updateActiveAddressFields: (fields: Partial<Omit<Address, "id" | "createdAt">>) => void;
  headerAddressLabel: string;
  fullAddressText: string;
  refreshAddresses: () => Promise<void>;
  clearAddressesOnSignOut: () => void;
}

const AddressContext = createContext<AddressContextType | undefined>(undefined);

// Chaves isoladas para Guest e Chaves Dinâmicas para Usuário Autenticado
const GUEST_STORAGE_KEY_ADDRESSES = "popshake_guest_addresses";
const GUEST_STORAGE_KEY_ACTIVE = "popshake_guest_active_address";
const LEGACY_STORAGE_KEY_ADDRESSES = "popshake_addresses";
const LEGACY_STORAGE_KEY_ACTIVE = "popshake_active_address";

const getUserAddressesKey = (userId: string) => `popshake_addresses_${userId}`;
const getUserActiveKey = (userId: string) => `popshake_active_address_${userId}`;

function locationToAddress(loc: UserLocation): Address {
  const street = loc.street || loc.address_line?.split(",")[0]?.trim() || "";
  const numPart = loc.number || (loc.address_line?.split(",")[1]?.split("-")[0]?.trim() || "");
  const neighPart = loc.neighborhood || (loc.address_line?.split("-")[1]?.trim() || "");

  return {
    id: loc.id,
    street,
    number: numPart,
    neighborhood: neighPart,
    city: loc.city || "Várzea Grande",
    complement: loc.complement || undefined,
    reference: loc.reference || undefined,
    zip: loc.zip || undefined,
    label: (loc.label || loc.name || "Casa") as any,
    latitude: loc.latitude ?? undefined,
    longitude: loc.longitude ?? undefined,
    createdAt: loc.created_at ? new Date(loc.created_at).getTime() : Date.now(),
  };
}

export function AddressProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [activeAddressId, setActiveAddressIdState] = useState<string | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);

  // Limpeza de chaves legadas e saneamento de armazenamento
  useEffect(() => {
    try {
      // Se houver chave legada compartilhada, migra para guest caso ainda não exista guest e deleta a chave perigosa
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY_ADDRESSES);
      const guestRaw = localStorage.getItem(GUEST_STORAGE_KEY_ADDRESSES);
      if (legacyRaw && !guestRaw) {
        localStorage.setItem(GUEST_STORAGE_KEY_ADDRESSES, legacyRaw);
      }
      localStorage.removeItem(LEGACY_STORAGE_KEY_ADDRESSES);
      localStorage.removeItem(LEGACY_STORAGE_KEY_ACTIVE);
    } catch {}
  }, []);

  // Carrega e sincroniza endereços baseado no estado de autenticação
  const loadAddresses = useCallback(async () => {
    if (authLoading) return;

    try {
      if (user?.id) {
        const addrKey = getUserAddressesKey(user.id);
        const actKey = getUserActiveKey(user.id);

        // 1. Carregamento imediato do cache local do usuário (0ms)
        const cachedRaw = localStorage.getItem(addrKey);
        const cachedActive = localStorage.getItem(actKey);
        if (cachedRaw) {
          try {
            const parsed = JSON.parse(cachedRaw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setAddresses(parsed);
              if (cachedActive && parsed.some((a) => a.id === cachedActive)) {
                setActiveAddressIdState(cachedActive);
              } else {
                setActiveAddressIdState(parsed[0].id);
              }
            }
          } catch {}
        }

        // 2. Migração pós-login: se o usuário preencheu endereços como Guest antes de logar
        const guestAddressesRaw = localStorage.getItem(GUEST_STORAGE_KEY_ADDRESSES);
        if (guestAddressesRaw) {
          try {
            const guestAddresses: Address[] = JSON.parse(guestAddressesRaw);
            if (Array.isArray(guestAddresses) && guestAddresses.length > 0) {
              for (const g of guestAddresses) {
                await userService.addLocation({
                  street: g.street,
                  number: g.number,
                  neighborhood: g.neighborhood,
                  city: g.city || "Várzea Grande",
                  complement: g.complement,
                  reference: g.reference,
                  zip: g.zip,
                  latitude: g.latitude,
                  longitude: g.longitude,
                  name: g.label || "Endereço",
                  is_default: true,
                });
              }
            }
          } catch (err) {
            console.error("Erro ao migrar endereços do guest:", err);
          } finally {
            // Remove dados de guest após migração segura
            localStorage.removeItem(GUEST_STORAGE_KEY_ADDRESSES);
            localStorage.removeItem(GUEST_STORAGE_KEY_ACTIVE);
          }
        }

        // 3. Sincronização remota completa com a API do banco de dados
        try {
          const serverLocations = await userService.getLocations(user.id);
          const mappedAddresses = serverLocations.map(locationToAddress);

          setAddresses(mappedAddresses);
          localStorage.setItem(addrKey, JSON.stringify(mappedAddresses));

          // Define endereço ativo
          const currentActive = localStorage.getItem(actKey);
          if (currentActive && mappedAddresses.some((a) => a.id === currentActive)) {
            setActiveAddressIdState(currentActive);
          } else if (mappedAddresses.length > 0) {
            setActiveAddressIdState(mappedAddresses[0].id);
            localStorage.setItem(actKey, mappedAddresses[0].id);
          } else {
            setActiveAddressIdState(null);
            localStorage.removeItem(actKey);
          }
        } catch (err) {
          console.warn("Erro ao buscar endereços do usuário no servidor:", err);
        }
      } else {
        // Usuário é Visitante (Guest) - isolado em chave de guest
        const savedAddressesRaw = localStorage.getItem(GUEST_STORAGE_KEY_ADDRESSES);
        const savedActiveRaw = localStorage.getItem(GUEST_STORAGE_KEY_ACTIVE);

        let loadedAddresses: Address[] = [];
        if (savedAddressesRaw) {
          try {
            const parsed = JSON.parse(savedAddressesRaw);
            if (Array.isArray(parsed)) {
              loadedAddresses = parsed;
              setAddresses(loadedAddresses);
            }
          } catch {}
        } else {
          setAddresses([]);
        }

        if (savedActiveRaw && loadedAddresses.some((a) => a.id === savedActiveRaw)) {
          setActiveAddressIdState(savedActiveRaw);
        } else if (loadedAddresses.length > 0) {
          setActiveAddressIdState(loadedAddresses[0].id);
          try {
            localStorage.setItem(GUEST_STORAGE_KEY_ACTIVE, loadedAddresses[0].id);
          } catch {}
        } else {
          setActiveAddressIdState(null);
        }
      }
    } catch (err) {
      console.warn("Erro ao sincronizar endereços:", err);
    } finally {
      setHasHydrated(true);
    }
  }, [user, authLoading]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  // Função de reset acionada no Logout para higienização completa em memória
  const clearAddressesOnSignOut = useCallback(() => {
    setAddresses([]);
    setActiveAddressIdState(null);
  }, []);

  // Escuta evento global de signout para reset imediato
  useEffect(() => {
    const handleSignOutEvent = () => {
      clearAddressesOnSignOut();
    };
    window.addEventListener("popshake:signout", handleSignOutEvent);
    return () => {
      window.removeEventListener("popshake:signout", handleSignOutEvent);
    };
  }, [clearAddressesOnSignOut]);

  const activeAddress = useMemo(() => {
    if (!activeAddressId || addresses.length === 0) return null;
    return addresses.find((a) => a.id === activeAddressId) || null;
  }, [activeAddressId, addresses]);

  const openAddressModal = useCallback((addressToEdit?: Address | null | unknown) => {
    if (
      addressToEdit &&
      typeof (addressToEdit as any).preventDefault !== "function" &&
      typeof addressToEdit === "object" &&
      "street" in addressToEdit
    ) {
      setEditingAddress(addressToEdit as Address);
    } else {
      setEditingAddress(null);
    }
    setIsAddressModalOpen(true);
  }, []);

  const closeAddressModal = useCallback(() => {
    setIsAddressModalOpen(false);
    setEditingAddress(null);
  }, []);

  const setActiveAddressId = useCallback(
    (id: string) => {
      setActiveAddressIdState(id);
      const actKey = user?.id ? getUserActiveKey(user.id) : GUEST_STORAGE_KEY_ACTIVE;
      try {
        localStorage.setItem(actKey, id);
      } catch (err) {
        console.error("Erro ao salvar endereço ativo:", err);
      }
    },
    [user]
  );

  const saveAddress = useCallback(
    async (
      addressData: Omit<Address, "id" | "createdAt">,
      idToUpdate?: string
    ): Promise<Address> => {
      // Se autenticado, persiste na API do banco de dados
      if (user?.id) {
        try {
          if (idToUpdate) {
            const res = await userService.updateLocation(idToUpdate, {
              street: addressData.street,
              number: addressData.number,
              neighborhood: addressData.neighborhood,
              city: addressData.city || "Várzea Grande",
              complement: addressData.complement,
              reference: addressData.reference,
              zip: addressData.zip,
              latitude: addressData.latitude,
              longitude: addressData.longitude,
              name: addressData.label || "Casa",
            });

            const savedAddr = locationToAddress(res);

            setAddresses((prev) => {
              const next = prev.map((a) => (a.id === idToUpdate ? savedAddr : a));
              try {
                localStorage.setItem(getUserAddressesKey(user.id), JSON.stringify(next));
              } catch {}
              return next;
            });

            return savedAddr;
          } else {
            const res = await userService.addLocation({
              street: addressData.street,
              number: addressData.number,
              neighborhood: addressData.neighborhood,
              city: addressData.city || "Várzea Grande",
              complement: addressData.complement,
              reference: addressData.reference,
              zip: addressData.zip,
              latitude: addressData.latitude,
              longitude: addressData.longitude,
              name: addressData.label || "Casa",
              is_default: true,
            });

            const savedAddr = locationToAddress(res);

            setAddresses((prev) => {
              const next = [savedAddr, ...prev.filter((a) => a.id !== savedAddr.id)];
              try {
                localStorage.setItem(getUserAddressesKey(user.id), JSON.stringify(next));
                localStorage.setItem(getUserActiveKey(user.id), savedAddr.id);
              } catch {}
              return next;
            });

            setActiveAddressIdState(savedAddr.id);
            return savedAddr;
          }
        } catch (err) {
          console.error("Erro ao persistir endereço no banco via API:", err);
        }
      }

      // Modo Guest / Fallback local
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

        const addrKey = user?.id ? getUserAddressesKey(user.id) : GUEST_STORAGE_KEY_ADDRESSES;
        const actKey = user?.id ? getUserActiveKey(user.id) : GUEST_STORAGE_KEY_ACTIVE;

        try {
          localStorage.setItem(addrKey, JSON.stringify(next));
          localStorage.setItem(actKey, savedAddr.id);
        } catch (err) {
          console.error("Erro ao persistir endereços:", err);
        }

        return next;
      });

      setActiveAddressIdState(savedAddr!.id);
      return savedAddr!;
    },
    [user]
  );

  const deleteAddress = useCallback(
    async (id: string) => {
      // Se autenticado, remove na API
      if (user?.id) {
        try {
          await userService.deleteLocation(id);
        } catch (err) {
          console.error("Erro ao excluir endereço na API:", err);
        }
      }

      setAddresses((prev) => {
        const next = prev.filter((a) => a.id !== id);
        const addrKey = user?.id ? getUserAddressesKey(user.id) : GUEST_STORAGE_KEY_ADDRESSES;
        const actKey = user?.id ? getUserActiveKey(user.id) : GUEST_STORAGE_KEY_ACTIVE;

        try {
          localStorage.setItem(addrKey, JSON.stringify(next));
        } catch (err) {
          console.error("Erro ao remover endereço do storage:", err);
        }

        if (activeAddressId === id) {
          const nextActive = next.length > 0 ? next[0].id : null;
          setActiveAddressIdState(nextActive);
          try {
            if (nextActive) {
              localStorage.setItem(actKey, nextActive);
            } else {
              localStorage.removeItem(actKey);
            }
          } catch {}
        }

        return next;
      });
    },
    [user, activeAddressId]
  );

  const updateActiveAddressFields = useCallback(
    (fields: Partial<Omit<Address, "id" | "createdAt">>) => {
      setAddresses((prev) => {
        const addrKey = user?.id ? getUserAddressesKey(user.id) : GUEST_STORAGE_KEY_ADDRESSES;
        const actKey = user?.id ? getUserActiveKey(user.id) : GUEST_STORAGE_KEY_ACTIVE;

        if (!activeAddressId || !prev.some((a) => a.id === activeAddressId)) {
          const newId =
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `addr_${Date.now()}`;
          const newAddr: Address = {
            id: newId,
            street: fields.street || "",
            number: fields.number || "",
            neighborhood: fields.neighborhood || "",
            city: fields.city || "Várzea Grande",
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
            localStorage.setItem(addrKey, JSON.stringify(next));
            localStorage.setItem(actKey, newId);
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
          localStorage.setItem(addrKey, JSON.stringify(next));
        } catch {}

        return next;
      });
    },
    [user, activeAddressId]
  );

  const refreshAddresses = useCallback(async () => {
    await loadAddresses();
  }, [loadAddresses]);

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
        editingAddress,
        openAddressModal,
        closeAddressModal,
        setActiveAddressId,
        saveAddress,
        deleteAddress,
        updateActiveAddressFields,
        headerAddressLabel,
        fullAddressText,
        refreshAddresses,
        clearAddressesOnSignOut,
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

