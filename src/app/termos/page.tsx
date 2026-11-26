"use client";

import React from "react";
import Link from "next/link";
import {
  FileText,
  ShoppingBag,
  Truck,
  CreditCard,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Scale,
} from "lucide-react";
import { SmartBackButton } from "@/components/ui/SmartBackButton";

export default function TermosDeUsoPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 py-10 sm:py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navegação Superior */}
        <div className="flex items-center justify-between">
          <SmartBackButton className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:text-pink-600 dark:hover:text-pink-400 transition-colors cursor-pointer" />

          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            Versão 2.0 • Novembro/2026
          </span>
        </div>

        {/* Hero Section */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-start gap-4">
            <div className="p-3 bg-pink-100 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 rounded-2xl shrink-0">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-100 dark:bg-pink-950/70 text-pink-700 dark:text-pink-300 text-xs font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                PopClub • Plataforma de Pedidos
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                Termos de Uso e Condições de Serviço
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
                Bem-vindo ao PopClub, a plataforma digital da Pop Shake Sorveteria. Ao realizar pedidos ou navegar em nosso aplicativo, você concorda com as condições descritas abaixo, pautadas na transparência, boa-fé e respeito ao Código de Defesa do Consumidor e à LGPD.
              </p>
            </div>
          </div>
        </div>

        {/* Tópicos dos Termos */}
        <div className="space-y-5 text-xs sm:text-sm text-zinc-600 dark:text-zinc-300">
          {/* 1. Objeto */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-bold text-base">
              <ShoppingBag className="w-5 h-5 text-pink-600 dark:text-pink-400" />
              <h2>1. O Serviço e Pedidos Digitais</h2>
            </div>
            <p className="leading-relaxed">
              O PopClub permite que os clientes consultem cardápios atualizados em tempo real, personalizem açaís, sorvetes e taças com complementos, apliquem cupons promocionais válidos e solicitem entrega em domicílio ou retirada no balcão de nossa loja física em Várzea Grande – MT.
            </p>
          </div>

          {/* 2. Acesso Rápido e Cadastro */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-bold text-base">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h2>2. Identificação e Acesso Rápido</h2>
            </div>
            <p className="leading-relaxed">
              Para máxima agilidade, permitimos pedidos pelo <strong>Acesso Rápido</strong> informando apenas Nome e WhatsApp válido com DDD. O cliente é responsável pela veracidade dos dados informados para que o entregador consiga localizá-lo e confirmar o recebimento do pedido. Caso deseje histórico consolidado e proteção por senha, o cliente pode criar uma conta completa a qualquer momento.
            </p>
          </div>

          {/* 3. Entrega e Cobertura */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-bold text-base">
              <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2>3. Entregas, Taxas e Horários</h2>
            </div>
            <p className="leading-relaxed">
              As entregas ocorrem dentro da zona de cobertura calculada dinamicamente pelo raio e rota quilométrica entre nossa loja e o ponto de entrega. Os prazos estimados exibidos na finalização do pedido são referenciais e podem variar de acordo com o volume de pedidos, clima e tráfego. Alimentos perecíveis e gelados são transportados em embalagens térmicas adequadas para garantir temperatura e consistência.
            </p>
          </div>

          {/* 4. Pagamentos e Segurança */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-bold text-base">
              <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h2>4. Formas de Pagamento e Cancelamentos</h2>
            </div>
            <p className="leading-relaxed">
              Aceitamos pagamentos via Pix Instantâneo, cartões de crédito e débito na entrega, ou dinheiro em espécie com opção de troco. Pedidos podem ser cancelados antes do início do preparo na cozinha. Por se tratar de alimento perecível personalizado sob demanda, após o preparo iniciado, cancelamentos sem motivo de força maior não serão passíveis de reembolso imediato.
            </p>
          </div>

          {/* 5. Privacidade e Proteção de Dados */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-bold text-base">
              <RotateCcw className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h2>5. Privacidade e Proteção de Dados (LGPD)</h2>
            </div>
            <p className="leading-relaxed">
              Ao criar uma conta ou utilizar a plataforma, o usuário declara estar ciente e de acordo com estes Termos e com a nossa{" "}
              <Link href="/privacidade" className="text-pink-600 dark:text-pink-400 font-semibold underline">
                Política de Privacidade
              </Link>
              , em cumprimento à Lei Federal nº 13.709/2018 (LGPD). O titular pode exercer os direitos de portabilidade e anonimização diretamente na área da conta (`/conta`) ou pelo canal oficial de DPO.
            </p>
          </div>

          {/* 6. Responsabilidade da Conta e Software */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-bold text-base">
              <Scale className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
              <h2>6. Segurança da Conta e Propriedade do Software</h2>
            </div>
            <p className="leading-relaxed">
              O usuário é responsável pela guarda de suas credenciais de acesso e pela veracidade das informações cadastrais. A plataforma PopClub é de propriedade intelectual da Equipe ADP, sem prejuízo das marcas comerciais do estabelecimento operador.
            </p>
          </div>
        </div>

        {/* Rodapé da Página */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500 border-t border-zinc-200 dark:border-zinc-800">
          <p>© {new Date().getFullYear()} Pop Shake Sorveteria. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4 font-semibold text-pink-600 dark:text-pink-400">
            <Link href="/privacidade" className="hover:underline">Política de Privacidade</Link>
            <Link href="/" className="hover:underline">Início</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
