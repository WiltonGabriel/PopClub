"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ArrowLeft,
  Lock,
  Cookie,
  UserCheck,
  FileText,
  Clock,
  Mail,
  Scale,
  Sparkles,
  Settings2,
  Database,
  HelpCircle,
} from "lucide-react";
import { privacyService } from "@/services/privacyService";

export default function PoliticaPrivacidadePage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 py-10 sm:py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navegação Superior */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:text-pink-600 dark:hover:text-pink-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Cardápio
          </Link>

          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            Atualizado: Outubro/2026
          </span>
        </div>

        {/* Hero Section */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-start gap-4">
            <div className="p-3 bg-pink-100 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 rounded-2xl shrink-0">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-xs font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                Conformidade com a LGPD e Marco Civil
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                Política de Privacidade & Proteção de Dados
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
                No PopClub (Pop Shake Sorveteria), sua privacidade é prioridade inegociável. Tratamos seus dados com total transparência, respeito aos princípios da Lei Geral de Proteção de Dados (Lei nº 13.709/2018) e às diretrizes da ANPD (Autoridade Nacional de Proteção de Dados).
              </p>
            </div>
          </div>
        </div>

        {/* Grade de Tópicos Escaneáveis */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: Controlador e DPO */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2.5 text-pink-600 dark:text-pink-400">
              <Scale className="w-5 h-5 shrink-0" />
              <h2 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                1. Controlador e Encarregado (DPO)
              </h2>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              O controlador dos dados é a <strong>Pop Shake Sorveteria e Delivery</strong>, sediada em Várzea Grande – MT.
            </p>
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800 text-xs space-y-1">
              <p className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" />
                Canal Oficial do Encarregado (Art. 41):
              </p>
              <a
                href="mailto:privacidade@popshake.com.br"
                className="text-pink-600 dark:text-pink-400 hover:underline font-mono text-[11px]"
              >
                privacidade@popshake.com.br
              </a>
            </div>
          </div>

          {/* Card 2: Minimização e Coleta */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2.5 text-pink-600 dark:text-pink-400">
              <Database className="w-5 h-5 shrink-0" />
              <h2 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                2. Minimização de Dados (Art. 6º, III)
              </h2>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Coletamos estritamente o necessário para a operação de entrega:
            </p>
            <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1.5 list-disc list-inside">
              <li><strong>Nome e WhatsApp:</strong> Para identificação e contato de entrega.</li>
              <li><strong>Endereço e GPS:</strong> Exclusivamente para cálculo de rota e frete.</li>
              <li><strong>Dados de Pagamento:</strong> Processados em gateway seguro; não guardamos dados de cartão no servidor.</li>
            </ul>
          </div>

          {/* Card 3: Bases Legais */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2.5 text-pink-600 dark:text-pink-400">
              <FileText className="w-5 h-5 shrink-0" />
              <h2 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                3. Bases Legais de Tratamento (Art. 7º)
              </h2>
            </div>
            <div className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
              <div className="border-l-2 border-emerald-500 pl-2">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">Execução de Contrato (Inciso V):</span> Para produzir seu açaí/sorvete e entregá-lo no seu endereço.
              </div>
              <div className="border-l-2 border-blue-500 pl-2">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">Obrigação Legal e Fiscal (Inciso II):</span> Guarda de comprovantes fiscais conforme legislação tributária (Art. 16, I).
              </div>
              <div className="border-l-2 border-amber-500 pl-2">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">Legítimo Interesse (Inciso IX):</span> Segurança cibernética, rate limiting e proteção contra fraudes.
              </div>
            </div>
          </div>

          {/* Card 4: Direitos do Titular (Art. 18) */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2.5 text-pink-600 dark:text-pink-400">
              <UserCheck className="w-5 h-5 shrink-0" />
              <h2 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                4. Seus Direitos (Art. 18 da LGPD)
              </h2>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Você possui total controle sobre seus dados pessoais:
            </p>
            <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1 list-disc list-inside">
              <li>Confirmar a existência de tratamento e consultar seus dados.</li>
              <li>Corrigir telefones, nomes ou endereços na tela de perfil.</li>
              <li><strong>Portabilidade (Art. 18, V):</strong> Baixar um arquivo estruturado com seus dados.</li>
              <li><strong>Anonimização e Exclusão (Art. 18, VI):</strong> Excluir sua conta e desidentificar seus dados em 1 clique na aba de privacidade da sua conta.</li>
            </ul>
          </div>
        </div>

        {/* Card Grande: Governança de Cookies (Guia ANPD) */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-pink-100 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 rounded-xl">
                <Cookie className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                  5. Governança de Cookies e Armazenamento Local
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Em estrita conformidade com o Guia Orientativo de Cookies da ANPD
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => privacyService.openPreferencesModal()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Settings2 className="w-3.5 h-3.5" />
              Configurar Cookies Agora
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-1">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                Estritamente Necessários
              </span>
              <p className="text-zinc-500 dark:text-zinc-400 text-[11px] leading-relaxed">
                Autenticação da sessão, itens da sacola de compras e proteção contra invasões (CSRF). Funcionam sem consentimento prévio nos termos da LGPD.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-1">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                Métricas & Desempenho
              </span>
              <p className="text-zinc-500 dark:text-zinc-400 text-[11px] leading-relaxed">
                Telemetria anônima sobre velocidade de carregamento para otimização da experiência. Desativado por padrão (Privacy by Default).
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-1">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                Preferências Locais
              </span>
              <p className="text-zinc-500 dark:text-zinc-400 text-[11px] leading-relaxed">
                Memorização de opções estéticas (tema claro/escuro) e acessibilidade no navegador do próprio cliente.
              </p>
            </div>
          </div>
        </div>

        {/* Card: Retenção e Segurança */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 text-pink-600 dark:text-pink-400">
            <Lock className="w-5 h-5 shrink-0" />
            <h2 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
              6. Segurança e Retenção Legal de Registros
            </h2>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            - <strong>Marco Civil da Internet (Lei nº 12.965/2014, Art. 15):</strong> Os registros de conexão e acesso à aplicação são mantidos sob sigilo pelo prazo estrito de 6 (seis) meses.<br />
            - <strong>Preservação Fiscal (Art. 16, I da LGPD):</strong> Em caso de solicitação de exclusão/anonimização de conta por parte do usuário, todos os dados identificáveis (nome, telefone, endereços, coordenadas) são destruídos irreversivelmente, preservando apenas os valores financeiros brutos dos pedidos para fechamento fiscal e cumprimento de obrigação tributária.<br />
            - <strong>Arquitetura Defensiva:</strong> Comunicação 100% criptografada via HTTPS/TLS, cookies com atributos <code>HttpOnly</code>, <code>SameSite=Lax</code> e <code>Secure</code>, e rate limiting adaptativo.
          </p>
        </div>

        {/* Rodapé Interno da Página */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500 border-t border-zinc-200 dark:border-zinc-800">
          <p>Dúvidas sobre o tratamento de dados? Entre em contato com nosso Encarregado pelo e-mail acima.</p>
          <div className="flex items-center gap-4 font-semibold text-pink-600 dark:text-pink-400">
            <Link href="/termos" className="hover:underline">Termos de Uso</Link>
            <Link href="/conta" className="hover:underline">Minha Conta & LGPD</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
