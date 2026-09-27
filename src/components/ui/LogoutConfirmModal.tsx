"use client";

import { LogOut } from "lucide-react";

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoggingOut?: boolean;
  isGuest?: boolean;
}

export function LogoutConfirmModal({ isOpen, onClose, onConfirm, isLoggingOut, isGuest }: LogoutConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1a1a2e] w-full max-w-sm rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-400">
            <LogOut className="w-8 h-8 ml-1" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {isGuest ? "Encerrar acesso rápido?" : "Deseja realmente sair da sua conta?"}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
            {isGuest
              ? "Seu acesso rápido neste dispositivo será finalizado. Para salvar seus dados e pedidos permanentemente, você pode completar seu cadastro com e-mail e senha."
              : "Ao sair, você precisará informar suas credenciais novamente para acompanhar seus pedidos ativos, resgatar cupons e acessar seus endereços cadastrados."}
          </p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoggingOut}
              className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              {isLoggingOut ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : null}
              {isLoggingOut
                ? "Saindo..."
                : isGuest
                ? "Sim, Encerrar Sessão"
                : "Sim, Sair da Conta"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoggingOut}
              className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium rounded-xl transition-colors active:scale-95 cursor-pointer"
            >
              Não, Continuar Conectado
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
