"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Cookie,
  ShieldCheck,
  Lock,
  Sliders,
  BarChart3,
  Settings2,
  Mail,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import { privacyService, CookieConsentPreferences } from "@/services/privacyService";

export default function PoliticaCookiesPage() {
  const [currentConsent, setCurrentConsent] = useState<CookieConsentPreferences | null>(null);

  useEffect(() => {
    setCurrentConsent(privacyService.getConsent());

    const handleConsentUpdated = (e: Event) => {
      const custom = e as CustomEvent<CookieConsentPreferences>;
      if (custom.detail) {
        setCurrentConsent(custom.detail);
      }
    };

    window.addEventListener("popclub:cookie-consent-updated", handleConsentUpdated as EventListener);
    return () => {
      window.removeEventListener("popclub:cookie-consent-updated", handleConsentUpdated as EventListener);
    };
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 py-10 sm:py-16 px-4 sm:px-6 lg:px-8 font-sans antialiased">
      <main className="max-w-4xl mx-auto space-y-10">
        {/* Navegação Superior */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/80 dark:border-zinc-800 pb-5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Cardápio
          </Link>

          <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
            <span>Última revisão: Novembro/2026</span>
            <span className="opacity-40">•</span>
            <Link href="/privacidade" className="hover:underline text-zinc-700 dark:text-zinc-300">
              Política de Privacidade
            </Link>
          </div>
        </div>

        {/* Cabeçalho Institucional (Quiet Design) */}
        <header className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-200/70 dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 text-xs font-semibold tracking-wide uppercase">
            <Cookie className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
            Transparência & LGPD
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Política de Cookies e Armazenamento Local
          </h1>

          <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-3xl">
            Esta página descreve de forma clara, técnica e transparente como o aplicativo <strong>PopShake</strong> (Pop Shake Sorveteria) utiliza cookies e tecnologias de armazenamento no seu navegador, em estrita conformidade com a <strong>Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD)</strong> e com o <strong>Guia Orientativo de Cookies da Autoridade Nacional de Proteção de Dados (ANPD)</strong>.
          </p>
        </header>

        {/* Bloco de Ação Rápida: Status do Consentimento e Botão de Alteração */}
        <section aria-labelledby="status-preferencias" className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 id="status-preferencias" className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-zinc-500" />
                Suas Preferências no Navegador
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Você pode revisar ou revogar seu consentimento a qualquer momento.
              </p>
            </div>

            <button
              type="button"
              onClick={() => privacyService.openPreferencesModal()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            >
              <Settings2 className="w-4 h-4" />
              Gerenciar Minhas Escolhas
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800/80">
              <span className="font-semibold block text-zinc-900 dark:text-zinc-100">Estritamente Necessários</span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ativo Permanente (Operacional)
              </span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800/80">
              <span className="font-semibold block text-zinc-900 dark:text-zinc-100">Preferências Locais</span>
              <span className={`text-[11px] font-medium flex items-center gap-1 mt-1 ${currentConsent?.preferences ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-500 dark:text-zinc-400"}`}>
                <Clock className="w-3.5 h-3.5" /> {currentConsent?.preferences ? "Autorizado" : "Desativado (Padrão)"}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800/80">
              <span className="font-semibold block text-zinc-900 dark:text-zinc-100">Métricas & Desempenho</span>
              <span className={`text-[11px] font-medium flex items-center gap-1 mt-1 ${currentConsent?.analytics ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-500 dark:text-zinc-400"}`}>
                <Clock className="w-3.5 h-3.5" /> {currentConsent?.analytics ? "Autorizado" : "Desativado (Padrão)"}
              </span>
            </div>
          </div>
        </section>

        {/* Seção 1: O que são Cookies e Tecnologias de Armazenamento */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            1. O que são Cookies e Armazenamento Web?
          </h2>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            <strong>Cookies HTTP</strong> são pequenos arquivos de texto transmitidos entre o servidor da aplicação e o seu navegador web, enviados automaticamente a cada requisição para reconhecer sua sessão de login e validar requisições contra ataques maliciosos.
          </p>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            <strong>Armazenamento Local (localStorage):</strong> É uma tecnologia moderna do navegador que permite guardar preferências e itens de compra diretamente no seu dispositivo, sem enviar dados repetidamente pela rede em toda navegação de página. Isso proporciona um carregamento instantâneo do cardápio e evita a perda de itens colocados na sua sacola.
          </p>
        </section>

        {/* Seção 2: Inventário Efetivo do Aplicativo PopShake */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            2. Inventário Completo das Tecnologias Utilizadas
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Documentamos abaixo com exatidão todas as chaves e cookies efetivamente existentes no código do PopShake, divididos por categoria e com seus respectivos prazos de retenção.
          </p>

          {/* Categoria A: Estritamente Necessários */}
          <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
              <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-base font-bold">
                A. Estritamente Necessários (Operacionais)
              </h3>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              <strong>Base Legal:</strong> Execução de contrato e procedimentos preliminares (Art. 7º, inciso V da LGPD). São essenciais para o funcionamento básico da loja virtual, autenticação segura do usuário e proteção contra fraudes. Não podem ser desativados sem inviabilizar o processamento do pedido.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
                    <th className="py-2.5 px-3 font-semibold">Identificador</th>
                    <th className="py-2.5 px-3 font-semibold">Tipo</th>
                    <th className="py-2.5 px-3 font-semibold">Finalidade Específica</th>
                    <th className="py-2.5 px-3 font-semibold">Prazo de Retenção</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 text-zinc-700 dark:text-zinc-300">
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-semibold text-zinc-900 dark:text-zinc-100">popshake_session</td>
                    <td className="py-2.5 px-3">Cookie Próprio (HttpOnly, Secure, SameSite=Lax)</td>
                    <td className="py-2.5 px-3">Autenticação segura via JWT, identificação da conta conectada e prevenção de ataques CSRF.</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">7 dias (ou até logout)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-semibold text-zinc-900 dark:text-zinc-100">auth_token</td>
                    <td className="py-2.5 px-3">Cookie Próprio (HttpOnly, Secure)</td>
                    <td className="py-2.5 px-3">Compatibilidade retroativa de endpoints legados de autenticação da plataforma.</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">7 dias (ou até logout)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-semibold text-zinc-900 dark:text-zinc-100">popclub_cart_v1</td>
                    <td className="py-2.5 px-3">localStorage</td>
                    <td className="py-2.5 px-3">Armazena os itens, sabores, complementos e quantidades da sua sacola de compras.</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">Até a conclusão da compra</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-semibold text-zinc-900 dark:text-zinc-100">popshake_addresses / active</td>
                    <td className="py-2.5 px-3">localStorage</td>
                    <td className="py-2.5 px-3">Endereços salvos e selecionados para estimativa de tempo e cálculo de taxa de entrega.</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">Persistente localmente</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-semibold text-zinc-900 dark:text-zinc-100">popshake_guest_orders</td>
                    <td className="py-2.5 px-3">localStorage</td>
                    <td className="py-2.5 px-3">Identificadores de pedidos realizados por clientes de acesso rápido para acompanhamento do status.</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">Persistente localmente</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-semibold text-zinc-900 dark:text-zinc-100">popclub_lgpd_consent</td>
                    <td className="py-2.5 px-3">localStorage</td>
                    <td className="py-2.5 px-3">Registro auditável das escolhas de consentimento para comprovação do dever de transparência (Art. 6º, X).</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">Persistente (até alteração)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Categoria B: Preferências e Personalização */}
          <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h3 className="text-base font-bold">
                B. Preferências e Personalização (Opcionais)
              </h3>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              <strong>Base Legal:</strong> Consentimento do titular (Art. 7º, inciso I da LGPD). Permitem que a interface memorize escolhas de visualização para proporcionar uma experiência adaptada às suas necessidades de usabilidade e acessibilidade. Desativado por padrão até manifestação voluntária.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
                    <th className="py-2.5 px-3 font-semibold">Identificador</th>
                    <th className="py-2.5 px-3 font-semibold">Tipo</th>
                    <th className="py-2.5 px-3 font-semibold">Finalidade Específica</th>
                    <th className="py-2.5 px-3 font-semibold">Prazo de Retenção</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 text-zinc-700 dark:text-zinc-300">
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-semibold text-zinc-900 dark:text-zinc-100">popshake-theme</td>
                    <td className="py-2.5 px-3">localStorage</td>
                    <td className="py-2.5 px-3">Memorização da preferência visual de tema (Claro, Escuro ou Automático do Sistema).</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">Persistente localmente</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-semibold text-zinc-900 dark:text-zinc-100">popshake-accessibility</td>
                    <td className="py-2.5 px-3">localStorage</td>
                    <td className="py-2.5 px-3">Configurações de acessibilidade (fonte ampliada, alto contraste, fonte disléxica, modo daltônico).</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">Persistente localmente</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-semibold text-zinc-900 dark:text-zinc-100">popclub_applied_coupon</td>
                    <td className="py-2.5 px-3">localStorage</td>
                    <td className="py-2.5 px-3">Código de cupom promocional salvo para preenchimento automático no fechamento da compra.</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">Até a conclusão do pedido</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-semibold text-zinc-900 dark:text-zinc-100">popshake_pwa_dismissed_until</td>
                    <td className="py-2.5 px-3">localStorage</td>
                    <td className="py-2.5 px-3">Timestamp de registro de recusa do popup de instalação do app, silenciando o aviso por até 4 meses.</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">4 meses (120 dias)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-semibold text-zinc-900 dark:text-zinc-100">popshake_pwa_install_prompt_enabled</td>
                    <td className="py-2.5 px-3">localStorage</td>
                    <td className="py-2.5 px-3">Preferência do usuário definida nas configurações para ativar ou desativar a exibição do popup de instalação.</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">Persistente localmente</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Categoria C: Métricas e Desempenho */}
          <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-base font-bold">
                C. Métricas e Desempenho Técnico (Opcionais)
              </h3>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              <strong>Base Legal:</strong> Consentimento do titular (Art. 7º, inciso I da LGPD). Atualmente, <strong>nenhuma ferramenta ou script de análise de uso ou telemetria encontra-se ativo</strong> no PopShake. Mantemos esta categoria desativada por padrão como salvaguarda preventiva de <em>Privacy by Design</em> para eventuais medições técnicas futuras (velocidade de carregamento e estabilidade) mediante sua autorização prévia.
            </p>
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 text-xs space-y-1.5">
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                Compromisso de Não Rastreamento Publicitário:
              </p>
              <p className="text-zinc-600 dark:text-zinc-400">
                O PopShake <strong>não</strong> utiliza ferramentas invasivas de terceiros como Google Analytics, Meta Pixel, TikTok Ads ou bibliotecas de rastreamento comportamental de vendas. Nenhuma informação sobre seus produtos favoritos é vendida ou repassada a redes externas de publicidade.
              </p>
            </div>
          </div>
        </section>

        {/* Seção 3: Serviços e Terceiros Envolvidos */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            3. Serviços e Terceiros Envolvidos
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
            Para prestar os serviços do delivery com velocidade e segurança, integramos exclusivamente prestadores de infraestrutura operacional, sem qualquer implantação de cookies invasivos de terceiros:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100">
                Geocodificação de Entregas (OpenStreetMap / Nominatim)
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Utilizado exclusivamente pelo servidor para conversão de logradouros em coordenadas de latitude e longitude e cálculo geodésico de raio de entrega. Nenhum dado do cliente ou cookie é enviado diretamente do seu navegador ao OpenStreetMap.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100">
                Hospedagem de Mídia Estática (Cloudinary)
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Utilizado para servir fotografias de alta resolução de taças de açaí, potes de sorvete e avatares de clientes. As imagens são carregadas sem cookies de identificação de perfil pessoal.
              </p>
            </div>
          </div>
        </section>

        {/* Seção 4: Como Alterar ou Revogar o Consentimento */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            4. Como Alterar suas Preferências ou Revogar o Consentimento
          </h2>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            A qualquer instante você pode modificar as categorias autorizadas ou revogar seu consentimento voluntário, sem qualquer custo ou penalidade:
          </p>

          <div className="space-y-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="font-bold text-zinc-900 dark:text-zinc-100 block">Pelo próprio aplicativo PopShake:</span>
                <span>Abra a central de preferências de cookies a qualquer momento clicando no botão ao lado ou no rodapé de qualquer página.</span>
              </div>
              <button
                type="button"
                onClick={() => privacyService.openPreferencesModal()}
                className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-medium shrink-0 cursor-pointer text-xs"
              >
                Abrir Preferências
              </button>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <span className="font-bold text-zinc-900 dark:text-zinc-100 block">Diretamente nas configurações do seu navegador web:</span>
              <p>
                Você pode bloquear ou excluir cookies existentes nas opções de privacidade do seu navegador:
              </p>
              <ul className="list-disc list-inside space-y-1 text-zinc-500 dark:text-zinc-400">
                <li><strong>Google Chrome:</strong> Configurações → Privacidade e Segurança → Cookies de terceiros.</li>
                <li><strong>Mozilla Firefox:</strong> Configurações → Privacidade e Segurança → Cookies e dados de sites.</li>
                <li><strong>Apple Safari:</strong> Preferências → Privacidade → Gerenciar dados de sites.</li>
                <li><strong>Microsoft Edge:</strong> Configurações → Cookies e permissões de site.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Seção 5: Seus Direitos Legais (LGPD Art. 18) e Canal do Encarregado */}
        <section className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-base font-bold">
              5. Seus Direitos como Titular e Canal de Contato (DPO)
            </h2>
          </div>

          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Nos termos do Art. 18 da LGPD, você tem o direito de obter a confirmação do tratamento, acessar seus dados pessoais, solicitar a correção de dados incompletos ou inexatos, realizar a portabilidade em formato estruturado (JSON) e solicitar a anonimização e exclusão da sua conta com eliminação dos dados cadastrais.
          </p>

          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-zinc-500" />
                Encarregado pelo Tratamento de Dados Pessoais (DPO):
              </span>
              <p className="text-zinc-500 dark:text-zinc-400">
                Para esclarecimentos adicionais, revogações formais ou requisições de direitos:
              </p>
            </div>
            <a
              href="mailto:privacidade@popshake.com.br"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-mono text-xs font-semibold transition-colors"
            >
              privacidade@popshake.com.br
              <ExternalLink className="w-3 h-3 text-zinc-400" />
            </a>
          </div>
        </section>

        {/* Rodapé Interno com Links Legais */}
        <footer className="pt-6 border-t border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-400">
          <p>© {new Date().getFullYear()} Pop Shake Sorveteria. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4 font-medium text-zinc-700 dark:text-zinc-300">
            <Link href="/privacidade" className="hover:underline flex items-center gap-1">
              Política de Privacidade <ChevronRight className="w-3 h-3" />
            </Link>
            <Link href="/conta" className="hover:underline flex items-center gap-1">
              Minha Conta & LGPD <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
