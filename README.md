# PopClub — Pop Shake Delivery PWA & Gestão Operacional

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Standalone-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Traefik](https://img.shields.io/badge/Traefik-v3-24A1C1?style=for-the-badge&logo=traefik&logoColor=white)
![Tailscale](https://img.shields.io/badge/Tailscale-Mesh%20VPN-49647C?style=for-the-badge&logo=tailscale&logoColor=white)
![Projeto Extensionista](https://img.shields.io/badge/Projeto%20Extensionista-UNIVAG%20TADS-8A2BE2?style=for-the-badge)
![Vitest](https://img.shields.io/badge/Vitest-354%20Passed-449C44?style=for-the-badge&logo=vitest&logoColor=white)
![LGPD](https://img.shields.io/badge/LGPD-Compliant-00B4D8?style=for-the-badge&logo=privatedivision&logoColor=white)
[![Google Drive](https://img.shields.io/badge/Google%20Drive-Documentos%20Oficiais-4285F4?style=for-the-badge&logo=googledrive&logoColor=white)](https://drive.google.com/drive/folders/1iw4oxwSWsKvCcCP9YZipzOM0B2B7JmdR?usp=sharing)

<br/>

**Plataforma de delivery PWA, esteira de produção Kanban em tempo real e gestão operacional.**

[Visão Geral](#-visão-geral) • [Topologia](#-topologia-de-arquitetura) • [Segurança & AppSec](#-segurança-blindagem-e-políticas-de-acesso-appsec) • [LGPD & Cookies](#-conformidade-lgpd-governança-de-cookies-e-privacy-by-design) • [Stack](#-stack-tecnológica) • [Setup Local](#-setup-de-desenvolvimento-local) • [Scripts](#-scripts-operacionais-e-manutenção) • [GitOps](#-governança-gitops--ciclo-de-deploy) • [Módulos](#-módulos-da-aplicação) • [Equipe](#-equipe-e-governança)

</div>

---

## 🍨 Visão Geral

O **PopClub** é um ecossistema full-stack projetado para fluxos de pedidos de alta rotatividade, unindo a interface do consumidor à operação da esteira de cozinha:

1. **Experiência do Consumidor (PWA):** Catálogo dinâmico com carrossel rotativo de categorias, cálculo de frete por GPS, temas Claro/Escuro (WCAG AA), montagem de itens sob medida, cupons, gatilhos de urgência e acompanhamento em tempo real.
2. **Esteira de Produção da Cozinha (Kanban + SSE):** Painel operacional sincronizado em tempo real via Server-Sent Events (`/api/orders/events`), com alertas sonoros automáticos via Web Audio API, barra de triagem de pedidos, cálculo dinâmico de tempo de entrega e impressão térmica de comandas (ESC/POS 80mm/58mm).
3. **Gestão e Controle de Turnos:** Abertura e fechamento de turnos com auditoria cega de caixa (dinheiro, cartão e PIX), bloqueio de fechamento com pedidos pendentes (`PENDING_ORDERS_ACTIVE`) e relatórios financeiros diários.
4. **Administração e Gestão de Cardápio:** Edição em tempo real de produtos, categorias com fotos WebP, selos de destaque, banners promocionais, avatares e notificações broadcast.

### 🎓 Projeto Integrador Extensionista (UNIVAG — TADS)
Este ecossistema foi concebido e implementado como entrega acadêmica do **Projeto Extensionista Integrador** do curso de **Tecnologia em Análise e Desenvolvimento de Sistemas (TADS)** do **Centro Universitário de Várzea Grande (UNIVAG)**:
- **Contexto de Estudo:** Pop Shake Sorveteria & Açaí Artesanal (Várzea Grande – MT).
- **Problema de Campo Estudado:** Redução da dependência de marketplaces intermediários (com taxas de 23% a 27%), estruturando um canal próprio de pedidos com gestão de cozinha e entregas.
- **Engenharia Térmica e Operacional:** Adequação da esteira Kanban para itens perecíveis sob calor regional (~4 minutos de janela térmica), integrando a triagem de pedidos ao despacho via WhatsApp para entregadores cadastrados.
- **Central de Documentação & Relatórios Oficiais (Google Drive):** Acesse a pasta compartilhada com relatórios consolidados, atas, documentos de requisitos e evidências do projeto em: [📁 Pasta Oficial no Google Drive](https://drive.google.com/drive/folders/1iw4oxwSWsKvCcCP9YZipzOM0B2B7JmdR?usp=sharing).

---

## 🗺️ Topologia de Arquitetura

O ecossistema opera sob uma arquitetura conteinerizada com isolamento de rede e paridade entre desenvolvimento e produção:

```mermaid
flowchart TD
    subgraph Users ["🌐 Tráfego Externo (Internet)"]
        Client["📱 Cliente Web / Mobile (PWA)"]
    end

    subgraph Edge ["🛡️ Borda e Segurança"]
        CF["Cloudflare WAF\n(Bypass cirúrgico para PWA)"]
    end

    subgraph VPS ["☁️ Servidor de Produção"]
        subgraph Ingress ["Proxy Reverso"]
            Traefik["🚦 Traefik v3\n(SSL Automático Let's Encrypt)"]
        end

        subgraph ContainerStack ["Stack Docker Compose"]
            App["📦 Next.js 16 Standalone\n(Node.js 20 / Porta 3000)"]
            DB[("🐘 PostgreSQL 16 Alpine\n(Porta 5432 / Volume Persistente)")]
        end
    end

    subgraph DevEnvironment ["🔒 Rede Privada Mesh (Tailscale)"]
        Dev["💻 Estação Local Dev"]
    end

    %% Roteamento de Produção
    Client -->|"HTTPS :443"| CF
    CF -->|"Proxy Seguro"| Traefik
    Traefik -->|"HTTPS Direto (Sem Gate Externo)"| App
    App -->|"Rede Interna Bridge"| DB

    %% Desenvolvimento Conectado Diretamente
    Dev -->|"Tailscale VPN:5432"| DB
```

### 🌐 Infraestrutura de Produção (`https://popshake.wnzk.dev.br/`)
A plataforma é executada em ambiente conteinerizado através da seguinte cadeia:
1. **Borda, WAF & DNS:** O [Cloudflare](https://www.cloudflare.com/) realiza terminação SSL pública, mitigação anti-DDoS e roteamento com bypass para recursos críticos de PWA (`/manifest.webmanifest`, `/_next/static/*`).
2. **Proxy Reverso do Host:** O **Traefik v3** intercepta as requisições HTTPS e balanceia o tráfego na rede Docker interna `proxy_network`.
3. **Orquestração:** O **Portainer CE** gerencia a stack declarativa (`docker-compose.yml` / `popshake-stack.yml`), controlando volumes e variáveis de ambiente.
4. **Pipeline CI/CD Contínuo:** A cada commit na branch `main`, o GitHub Actions executa os testes (`npm test`), linter (`npm run lint`), compila a imagem Docker multi-stage e a publica no **GitHub Container Registry (GHCR)** sob a tag `ghcr.io/wiltongabriel/popclub:latest`.
5. **Banco de Dados Isolado:** Instância PostgreSQL 16 Alpine protegida em rede privada bridge (`popshake_internal`), sem exposição para a internet pública. O acesso administrativo remoto ocorre exclusivamente via VPN **Tailscale**.

Para aprofundamento das decisões arquiteturais, fluxos de rede, segurança e contratos da API, consulte:
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — Topologia, stack e pipeline de deploy
- [docs/API_REFERENCE.md](docs/API_REFERENCE.md) — Referência de endpoints REST, SSE e RBAC
- [docs/SECURITY.md](docs/SECURITY.md) — Zero Trust, JWT, Rate Limiting e LGPD
- [docs/ANALYTICS_KPIS.md](docs/ANALYTICS_KPIS.md) — Fórmulas de KPIs, SLA e gráficos operacionais

---

## 🔐 Segurança, Blindagem e Políticas de Acesso (AppSec)

O sistema conta com uma **Arquitetura Zero Trust nativa** (proteção de borda em `src/proxy.ts` + verificação de permissões e `tokenVersion` nos Route Handlers) e implementa travas lógicas e Rate Limits estritos contra ataques de negação de serviço, inchaço de disco e abusos de uso.

### Tabela de Rate Limits (Rotas Abertas e Operacionais)
| Contexto | Rota / API | Restrição (Teto/Rate Limit) | Finalidade |
| :--- | :--- | :--- | :--- |
| **Endereços Ativos** | `/api/users/locations` | Máx. 10 por conta | Impede criação em massa de endereços por bots. |
| **Login e Fast Access** | `/api/auth/login`, `fast-access` | 5 requisições / minuto (IP) | Evita ataques de força bruta (Brute Force). |
| **Recuperação Senha** | `/api/auth/forgot-password` | 3 solicitações a cada 15 min | Evita flood de e-mails e ataques de enumeração. |
| **Validação de Cupons** | `/api/coupons/validate` | 10 tentativas / minuto (IP) | Previne enumeração e adivinhação de códigos. |
| **Notificações Broadcast** | `/api/notifications` | Cooldown de 5 minutos | Bloqueia loops acidentais ou maliciosos de spam (Admin). |

### Proteções de Banco de Dados e Uploads
- **Limites de Payload (Zod):** Validação estrita de esquemas para evitar payloads malformados ou excessivos. Nomes limitados a 100 caracteres e descrições limitadas a 1000 caracteres.
- **Cotas de Criação (Painel Admin):** Limites lógicos de volume aplicados (máximo de 300 produtos, 100 cupons, 30 categorias e 30 avatares presets).
- **Gating de Uploads:** Somente administradores autorizados efetuam upload, com teto de `5MB`, validação estrita de extensões/MIME e conversão compulsória para WebP no servidor (`sharp`).

---

## 🛡️ Conformidade LGPD, Governança de Cookies e Privacy by Design

O PopClub adota conformidade com a **Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)**, o **Marco Civil da Internet (Lei nº 12.965/2014)** e os **Guias Orientativos da ANPD (Autoridade Nacional de Proteção de Dados)**.

### 1. Princípios Operacionais e Minimização (Art. 6º e 7º)
- **Minimização da Coleta (Art. 6º, III):** No Acesso Rápido (*Fast Access*), são coletados estritamente Nome Completo e WhatsApp válido com DDD, com aviso contextual no ponto de coleta (Art. 9º).
- **Geolocalização Estrita:** Coordenadas de GPS são solicitadas exclusivamente para cálculo dinâmico da rota e valor do frete, sem rastreamento contínuo em segundo plano.
- **Bases Legais Claras:** Tratamento alicerçado em *Execução de Contrato (Art. 7º, V)*, *Obrigação Legal e Fiscal (Art. 7º, II)* e *Legítimo Interesse com Salvaguardas (Art. 7º, IX)*.

### 2. Governança de Cookies e Storage (Guia Oficial ANPD)
- **Classificação Técnica:**
  - **Estritamente Necessários (Essenciais):** Sessão de autenticação, itens da sacola/carrinho, tokens CSRF e identificador de entrega (Art. 7º, V).
  - **Opcionais (Analíticos e Preferências):** Desativados por padrão (*Privacy by Default*).
- **Banner Flutuante Minimalista:** Componente discreto (`CookieConsentBanner`) não bloqueante.
- **Autonomia Contínua:** Preferência gravada em `popclub_lgpd_consent` com modal reabrível a qualquer momento no rodapé (`privacyService.openPreferencesModal()`).

### 3. Direitos do Titular (Art. 18) e Retenção Fiscal (Art. 16, I)
- **Portabilidade de Dados (Art. 18, V):** Endpoint `GET /api/users/privacy` que exporta um arquivo JSON com dados cadastrais, locais salvos, pedidos e identificação do Encarregado (DPO).
- **Anonimização Irreversível (Art. 18, VI):** Na aba *Privacidade & LGPD* (`/conta`), o titular pode solicitar a anonimização imediata da conta (expurgo de PII mantendo registros contábeis desidentificados conforme **Art. 16, I da LGPD**).
- **Marco Civil da Internet (Art. 15):** Guarda de registros de conexão e acesso pelo prazo legal de 6 meses.
- **Canal do Encarregado (DPO — Art. 41):** `privacidade@popshake.com.br` com páginas informativas em `/privacidade` e `/termos`.

---

## 💻 Stack Tecnológica

| Camada | Tecnologias Principais |
| :--- | :--- |
| **Frontend** | [Next.js 16](https://nextjs.org/) (App Router, Standalone), [React 19](https://react.dev/), [TypeScript 5](https://www.typescriptlang.org/), [Tailwind CSS 3.4](https://tailwindcss.com/), [Shadcn UI](https://ui.shadcn.com/) (`@base-ui/react`), [Lucide React](https://lucide.dev/) |
| **PWA & Offline** | [`@ducanh2912/next-pwa`](https://github.com/DuCanhGH/next-pwa), Service Workers, Workbox Caching, Web Manifest |
| **Backend & APIs** | Next.js Route Handlers RESTful, Server-Sent Events (SSE), [Zod](https://zod.dev/) |
| **Banco de Dados & ORM** | [PostgreSQL 16](https://www.postgresql.org/) (Alpine), [Prisma ORM 6](https://www.prisma.io/) |
| **Segurança & Auth** | JWT (`jsonwebtoken`), Criptografia com `bcryptjs`, Cookies `HttpOnly`, RBAC granular e `src/proxy.ts` |
| **Geolocalização & Mapas** | [Leaflet](https://leafletjs.com/) (`leaflet` + `react-leaflet`), [OpenStreetMap](https://www.openstreetmap.org/), [OSRM Routing](https://project-osrm.org/) e Nominatim Geocoding |
| **Infraestrutura & GitOps** | Docker (Multi-stage Debian bookworm-slim), Docker Compose, Portainer CE, Traefik v3, Cloudflare, Tailscale |

---

## 🚀 Setup de Desenvolvimento Local

O projeto permite execução **100% local e autônoma** (ideal para avaliação acadêmica e desenvolvimento isolado) ou conectada via VPN privada.

### 1. Pré-requisitos
- [Node.js](https://nodejs.org/) versão 20 LTS ou superior.
- [Docker](https://www.docker.com/) e Docker Compose instalados.
- [Git](https://git-scm.com/) para clonagem do repositório.

---

### Opção A: Execução Local 100% Autônoma e Isolada (Recomendado para Avaliação)
Permite subir um container isolado do PostgreSQL, aplicar o schema e rodar o sistema localmente em qualquer máquina:

```bash
# 1. Clonar o repositório e entrar no diretório
git clone https://github.com/WiltonGabriel/PopClub.git
cd PopClub

# 2. Instalar as dependências do projeto
npm install

# 3. Subir o container local isolado do PostgreSQL 16
docker compose -f docker-compose.dev.yml up -d

# 4. Copiar o arquivo de variáveis de ambiente de exemplo
cp .env.example .env

# 5. Gerar cliente Prisma, sincronizar o schema e popular o banco de exemplo (seed)
npx prisma generate
npx prisma db push
npx prisma db seed

# 6. Iniciar a aplicação em modo desenvolvimento
npm run dev
```

Acesse a vitrine em [http://localhost:3000](http://localhost:3000) e a área de gestão em [http://localhost:3000/admin](http://localhost:3000/admin).

---

### Opção B: Centralização com Paridade de Ambiente (Tailscale VPN)
Utilizada no fluxo da equipe para desenvolvimento conectado à instância privada via VPN:
```bash
# 1. Conectar à malha privada segura
tailscale up

# 2. Configurar o .env apontando para o IP da VPN
# DATABASE_URL="postgresql://postgres:SUA_SENHA@SEU_IP_VPN:5432/popclub?schema=public"

# 3. Gerar os tipos do Prisma e iniciar
npx prisma generate
npm run dev
```

---

## 🛠️ Scripts Operacionais e Manutenção

| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia o servidor local Next.js com live reload em todas as interfaces de rede. |
| `npm run build` | Compilação estrita de produção (TypeScript check, bundler Webpack e modo standalone). |
| `npm run lint` | Executa a análise estática com o ESLint configurado para Next.js (0 erros). |
| `npm test` | **Suíte de Testes Automatizados (Vitest)**: executa 354 testes em 49 arquivos (unitários e de integração: LGPD, cookies, IDOR, horários, RBAC, AppSec, estoque, esteira, SSE, analytics e financeiro). |
| `npm run test:watch` | Executa a suíte Vitest em modo interativo contínuo (TDD). |
| `npm run test:coverage` | Gera o relatório de cobertura de código automatizado (`@vitest/coverage-v8`). |
| `npx tsc --noEmit` | **Typecheck Estrito**: valida 100% da tipagem estática sem emitir artefatos. |
| `npx prisma generate` | Regenera o cliente tipado `@prisma/client` a partir do schema relacional. |
| `node scripts/smoke-test-all.mjs` | **Suíte E2E / Sanity Checks**: verifica fluxos de Auth, Vitrine, Pedidos e Cupons. |
| `node scripts/diagnose-db.mjs` | Diagnóstico de latência de rede, contagem de registros e verificação de queries. |
| `node scripts/backup-db.mjs` | **Backup de Segurança**: clona dados no PostgreSQL (`backup_slot_1` e `backup_slot_2`, máx. 2 backups). |
| `node scripts/restore-db.mjs <1\|2>` | **Restauração de Desastre**: recupera dados a partir de um dos slots com rollback atômico. |
| `node scripts/utils/reset-admin.mjs` | Redefine a senha do usuário Administrador (`admin@popclub.com`). |
| `node scripts/utils/transfer-db.mjs` | Utilitário relacional para exportação e importação de dados entre instâncias PostgreSQL. |

### 🛡️ Política de Backup do Banco de Dados

> [!WARNING]
> **SEMPRE REALIZE UM BACKUP ANTES DE QUALQUER OPERAÇÃO CRÍTICA OU MIGRAÇÃO!**

- **Limite Estrito de 2 Backups:** O sistema gerencia uma política de **retenção máxima de 2 backups** via rotação automática (FIFO):
  - **No PostgreSQL:** Os dados são clonados em schemas dedicados (`backup_slot_1` e `backup_slot_2`).
  - **Em Arquivo Local:** Gera e mantém no máximo 2 dumps JSON em `backups/` (removendo os mais antigos automaticamente).
- **Criar Backup:** `node scripts/backup-db.mjs` (ou `npm run db:backup`)
- **Restaurar Backup:** `node scripts/restore-db.mjs 1` (ou `2`)

> Detalhes adicionais estão disponíveis em [scripts/README.md](scripts/README.md).

---

## 🔄 Governança GitOps & Ciclo de Deploy

O repositório opera sob as diretrizes documentadas em [docs/GITOPS.md](docs/GITOPS.md):

1. **Single Source of Truth:** A branch **`main`** no GitHub é a única fonte da verdade.
2. **Ciclo Obrigatório de Alteração (Quality Gate Pré-Push):**
   ```bash
   npx tsc --noEmit
   npm test
   npm run lint
   npm run build
   ```
3. **Pipeline de CI/CD (GitHub Actions):** Ao receber push em `main`, o workflow executa `npm test` + `npm run lint`, compila a imagem Docker multi-stage e publica no **GitHub Container Registry (GHCR)**.
4. **Deploy Automatizado (Portainer CE):** No Portainer, a stack em produção atualiza o container e o `entrypoint.sh` sincroniza o schema Prisma antes de iniciar o runtime Next.js Standalone.

---

## 📦 Módulos da Aplicação

### 1. Storefront & Experiência do Cliente (PWA)
- **Design Adaptativo & Temas:** Suporte nativo a Dark Mode persistente (WCAG AA) e interface mobile touch-first.
- **Categorias & Carrossel Rotativo:** Visualização em carrossel rotativo com fotos otimizadas em WebP pelo servidor (`sharp`) e ordenação customizável.
- **Motor de Urgência & Escassez:** Banners interativos com contadores regressivos para promoções limitadas.
- **Transparência de Horários & Status da Loja:** Cálculo dinâmico do status de abertura (Aberto, Fechado ou Pausa Operacional).
- **Geolocalização & Frete:** Detecção de endereço assistida por GPS com Leaflet, OpenStreetMap e roteamento OSRM.
- **Acesso Rápido (*Fast Access*):** Fluxo de identificação simplificado por nome e WhatsApp.

### 2. Esteira Kanban de Cozinha & Triagem de Pedidos
- **Quadro de Produção em Tempo Real (SSE):** Colunas dinâmicas (*Pendentes*, *Em Preparo*, *Prontos*, *Em Rota* e *Concluídos*) atualizadas via Server-Sent Events.
- **Pausa Emergencial da Esteira:** Interruptor no painel operacional (`conveyorActive`) para contenção de sobrecarga na cozinha.
- **Alerta Sonoro Nativo:** Notificação sonora em novos pedidos via Web Audio API.
- **Impressão Térmica ESC/POS:** Geração de comandas otimizadas para impressoras térmicas de 80mm e 58mm.

### 3. Logística de Entrega (WhatsApp & Telemetria)
- **Despacho Ágil via WhatsApp:** Formatação automática da rota e dados de entrega para o entregador selecionado.
- **Telemetria GPS ao Vivo:** Rastreamento via token único (`/entrega/[token]`).

### 4. Gestão de Turnos & Fechamento de Caixa (Shifts)
- **Controle de Sessões de Caixa:** Abertura e fechamento de turnos com contagem cega por forma de pagamento (Dinheiro, PIX e Cartão).
- **Bloqueio de Fechamento com Pedidos Ativos:** Impede o encerramento do turno enquanto houver comandas não finalizadas (`PENDING_ORDERS_ACTIVE`).

### 5. Painel Administrativo & Analytics
- **Métricas & Desempenho ([docs/ANALYTICS_KPIS.md](docs/ANALYTICS_KPIS.md)):** Faturamento e volume combinados (`ComposedChart`), horários de pico e dias da semana, SLA real de cozinha/rota, retenção/recompra, mix por categoria, attach rate de adicionais, cupons, entregadores e auditoria de cancelamentos/ocorrências.
- **Gestão de Horários Semanais:** Configuração de abertura e fechamento por dia da semana com validação de fuso horário.
- **Identidade Visual & Personalização:** Customização de splash screen, avatares, banners e zonas de entrega.

### 6. Engenharia de Qualidade, AppSec & Exceções de Domínio
- **Suíte de Testes Automatizados (Vitest):** 354 testes em 49 arquivos validando LGPD, cookies, isolamento IDOR, horários, estoques, precificação, RBAC, auditoria, esteira e analytics.
- **Exceções de Domínio:** Tratamento padronizado (`DomainException`, `handleApiError`) com sanitização de logs.
- **Segurança Defensiva Zero Trust:** Rate limiting em rotas sensíveis e validação estrita com Zod.

---

## 👥 Equipe e Governança

O projeto **PopClub** é mantido pela **Equipe ADP**, no âmbito do Projeto Extensionista Integrador (UNIVAG — TADS):

- **Wilton Gabriel Albuquerque Pereira — Arquiteto de Software & Mantenedor Principal**  
  Responsável pela arquitetura da solução, desenvolvimento e implementação do sistema, decisões técnicas, segurança e manutenção do repositório.
- **Adriel Felipe Tapajós — Analista de Documentação**  
  Responsável pela elaboração e organização da documentação técnica e materiais de entrega.
- **João Lucas Lima da Silva — Analista de Qualidade & Relacionamento**  
  Responsável pela validação funcional, apoio aos testes e comunicação de requisitos.

### Direitos Autorais
- **© Equipe ADP.** Todos os direitos reservados.
