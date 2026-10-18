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
![Vitest](https://img.shields.io/badge/Vitest-120%20Passed-449C44?style=for-the-badge&logo=vitest&logoColor=white)
![LGPD](https://img.shields.io/badge/LGPD-Compliant-00B4D8?style=for-the-badge&logo=privatedivision&logoColor=white)
[![Google Drive](https://img.shields.io/badge/Google%20Drive-Documentos%20Oficiais-4285F4?style=for-the-badge&logo=googledrive&logoColor=white)](https://drive.google.com/drive/folders/1iw4oxwSWsKvCcCP9YZipzOM0B2B7JmdR?usp=sharing)

<br/>

**Plataforma proprietária de delivery, esteira de produção Kanban e gestão operacional para açaís e sorvetes artesanais.**

[Visão Geral](#-visão-geral) • [Topologia](#-topologia-de-arquitetura) • [Segurança & AppSec](#-segurança-blindagem-e-políticas-de-acesso-appsec) • [LGPD & Cookies](#-conformidade-lgpd-governança-de-cookies-e-privacy-by-design) • [Stack](#-stack-tecnológica) • [Setup Local](#-setup-de-desenvolvimento-local) • [Scripts](#-scripts-operacionais) • [GitOps](#-governança-gitops) • [Módulos](#-módulos-da-aplicação) • [Equipe e Governança](#-equipe-e-governança)

</div>

---

> [!NOTE]
> **REPOSITÓRIO PRIVADO — USO RESTRITO**
> Código-fonte e documentação de acesso restrito no âmbito do projeto. Este software não é de código aberto (open-source) e seu uso, reprodução ou distribuição dependem de autorização prévia.

---

## 🍨 Visão Geral

O **PopClub (Pop Shake Delivery)** é um ecossistema full-stack projetado especificamente para as demandas de alta rotatividade de sorveterias e açaíterias artesanais. O sistema une a ponta do consumidor à operação industrial da esteira de cozinha:

1. **Experiência do Consumidor (PWA):** Catálogo dinâmico com carrossel rotativo de categorias, cálculo de frete por GPS, temas Claro/Escuro (WCAG AA), montagem de itens sob medida, cupons, gatilhos de urgência e acompanhamento em tempo real.
2. **Esteira de Produção da Cozinha (Kanban):** Painel operacional em tempo real com alertas sonoros automáticos via Web Audio API, barra de triagem de pedidos, cálculo dinâmico de tempo de entrega e impressão térmica de comandas (ESC/POS 80mm/58mm).
3. **Gestão e Controle de Turnos:** Abertura e fechamento de turnos com auditoria cega de caixa (dinheiro, cartão e PIX), bloqueio de fechamento com pedidos pendentes (`PENDING_ORDERS_ACTIVE`) e relatórios financeiros diários.
4. **Administração e Gestão de Cardápio:** Edição em tempo real de produtos, categorias com fotos WebP, selos de destaque, banners promocionais, avatares e notificações broadcast.

### 🎓 Projeto Integrador Extensionista (UNIVAG — TADS)
Este ecossistema foi concebido e implementado como entrega formal do **Projeto Extensionista Integrador** do curso de **Tecnologia em Análise e Desenvolvimento de Sistemas (TADS)** do **Centro Universitário de Várzea Grande (UNIVAG)**:
- **Empresa Parceira Beneficiária:** Pop Shake Sorveteria & Açaí Artesanal (Várzea Grande – MT).
- **Problema de Campo Solucionado:** Eliminação da dependência de marketplaces predatórios de delivery (com taxas de 23% a 27%), proporcionando soberania comercial, redução de custos e um canal proprietário direto para a comunidade local.
- **Engenharia Térmica e Operacional:** Adequação estrita da esteira Kanban para o açaí artesanal da região de Cuiabá/Várzea Grande, que sofre com perda acelerada de consistência térmica sob calor extremo (~4 minutos), integrando a triagem de pedidos ao despacho instantâneo via WhatsApp dos entregadores cadastrados.
- **Central de Documentação & Relatórios Oficiais (Google Drive):** Acesse a pasta compartilhada com relatórios consolidados, atas, documentos de requisitos canônicos e evidências formais do projeto em: [📁 Pasta Oficial no Google Drive](https://drive.google.com/drive/folders/1iw4oxwSWsKvCcCP9YZipzOM0B2B7JmdR?usp=sharing).

---

## 🗺️ Topologia de Arquitetura

O ecossistema opera sob uma arquitetura conteinerizada na infraestrutura de produção **Grein Cloud 01**, com isolamento de rede e paridade absoluta entre desenvolvimento e produção:

```mermaid
flowchart TD
    subgraph Users ["🌐 Tráfego Externo (Internet)"]
        Client["📱 Cliente Web / Mobile (PWA)"]
    end

    subgraph Edge ["🛡️ Borda e Segurança"]
        CF["Cloudflare WAF\n(Bypass cirúrgico para PWA)"]
    end

    subgraph VPS ["☁️ Servidor de Produção (Grein Cloud 01)"]
        subgraph Ingress ["Proxy Reverso"]
            Traefik["🚦 Traefik v3\n(SSL Automático Let's Encrypt)"]
            Authelia["🔒 Authelia SSO\n(Proteção da Área de Gestão)"]
        end

        subgraph ContainerStack ["Stack Docker Compose"]
            App["📦 Next.js 16 Standalone\n(Node.js 20 / Porta 3000)"]
            DB[("🐘 PostgreSQL 16 Alpine\n(Porta 5432 / Volume Persistente)")]
        end
    end

    subgraph DevEnvironment ["🔒 Rede Privada Mesh (Tailscale)"]
        Dev["💻 Estação Local Dev\n(Ambiente Antigravity)"]
    end

    %% Roteamento de Produção
    Client -->|"HTTPS :443"| CF
    CF -->|"Proxy Seguro"| Traefik
    Traefik -->|"Roteador Público (Prioridade 100 - Estáticos/Manifest)"| App
    Traefik -->|"Roteador Protegido (Authelia - Prioridade 1)"| Authelia
    Authelia -->|"Sessão Validada"| App
    App -->|"Rede Interna Bridge"| DB

    %% Desenvolvimento Conectado Diretamente
    Dev -->|"Tailscale 100.127.79.49:5432"| DB
```

### 🌐 Infraestrutura de Produção Ativa (`https://popshake.wnzk.dev.br/`)
A plataforma é executada em regime ininterrupto na VPS **Grein Cloud 01** através de uma cadeia resiliente:
1. **Borda, WAF & DNS:** O [Cloudflare](https://www.cloudflare.com/) realiza terminação SSL pública, mitigação anti-DDoS e roteamento com bypass para recursos críticos de PWA (`/manifest.webmanifest`, `/_next/static/*`).
2. **Proxy Reverso do Host:** O **Traefik v3** intercepta as requisições HTTPS e balanceia o tráfego na rede Docker interna `proxy_network`.
3. **Orquestração:** O **Portainer CE** gerencia a stack declarativa do PopClub (`popshake-stack.yml`), controlando volumes e variáveis de ambiente.
4. **Pipeline CI/CD Contínuo:** A cada commit na branch `main`, o GitHub Actions compila a imagem Docker multi-stage com cache e a publica no **GitHub Container Registry (GHCR)** sob a tag `ghcr.io/wiltongabriel/popclub:latest`. O Portainer atualiza a aplicação via *Re-pull image and redeploy*.
5. **Banco de Dados Isolado:** Instância PostgreSQL 16 Alpine protegida em rede privada bridge, inacessível diretamente pela internet pública. O acesso administrativo seguro ocorre exclusivamente através da VPN **Tailscale**.

Para aprofundamento das decisões arquiteturais e fluxos de rede, consulte o documento técnico [docs/ARCHITECTURE.md](file:///home/wiltongx/Projetos/PastePopClub/PopClub/docs/ARCHITECTURE.md).

---

## 🔐 Segurança, Blindagem e Políticas de Acesso (AppSec)

O sistema conta com uma **Arquitetura Zero Trust nativa** (o próprio sistema defende suas rotas através de *Route Handlers*, limitando a dependência de WAFs externos) e implementa travas lógicas e Rate Limits estritos para proteção contra ataques de negação de serviço, inchaço de disco e abusos de uso.

### Tabela de Rate Limits (Rotas Abertas e Operacionais)
| Contexto | Rota / API | Restrição (Teto/Rate Limit) | Finalidade |
| :--- | :--- | :--- | :--- |
| **Endereços Ativos** | `/api/users/locations` | Máx. 10 por conta | Impede botnets de criarem infinitos endereços. |
| **Login e Fast Access** | `/api/auth/login`, `fast-access` | 5 requisições / minuto (IP) | Evita ataques de força bruta (Brute Force). |
| **Recuperação Senha** | `/api/auth/forgot-password` | 3 solicitações a cada 15 min | Evita flood de e-mails e ataques de enumeração. |
| **Validação de Cupons** | `/api/coupons/validate` | 10 tentativas / minuto (IP) | Previne scripts adivinhadores de códigos (Brute Force). |
| **Notificações Broadcast** | `/api/notifications` | Cooldown de 5 minutos | Bloqueia loops acidentais ou maliciosos de Spam (Admin). |

### Proteções de Banco de Dados e Uploads
- **Limites de Payload (Zod):** Injeção de textos estourados (String/Json sem limite do PostgreSQL) bloqueados por `schema validations`. Nomes limitados a 100 caracteres e descrições limitadas a 1000 caracteres.
- **Cotas de Criação (Painel Admin):** Limites lógicos de volume aplicados (Máximo de 300 produtos, 100 cupons, 30 categorias e 30 avatares presets) para evitar que contas de administrador comprometidas lotem o banco.
- **Gating de Uploads:** Somente administradores efetuam upload, travado em `5MB`, extensões/MIME restritas e conversão compulsória de imagens (WebP) pelo lado servidor (`sharp`).

---

## 🛡️ Conformidade LGPD, Governança de Cookies e Privacy by Design

O PopClub adota conformidade rigorosa com a **Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)**, o **Marco Civil da Internet (Lei nº 12.965/2014)** e os **Guias Orientativos da ANPD (Autoridade Nacional de Proteção de Dados)**, assegurando uma experiência minimalista, amigável e não invasiva para o cliente final.

### 1. Princípios Operacionais e Minimização (Art. 6º e 7º)
- **Minimização da Coleta (Art. 6º, III):** No Acesso Rápido (*Fast Access*), são coletados estritamente Nome Completo e WhatsApp válido com DDD, com aviso contextual no ponto de coleta (Art. 9º) de que o número é utilizado unicamente para confirmação e contato de entrega.
- **Geolocalização Estrita:** Coordenadas de GPS são solicitadas exclusivamente para cálculo dinâmico da rota e valor do frete, sem rastreamento contínuo em segundo plano da vida privada do usuário.
- **Bases Legais Claras:** Tratamento alicerçado em *Execução de Contrato (Art. 7º, V)*, *Obrigação Legal e Fiscal (Art. 7º, II)* e *Legítimo Interesse com Salvaguardas (Art. 7º, IX)*.

### 2. Governança de Cookies e Storage (Guia Oficial ANPD)
- **Classificação Técnica:**
  - **Estritamente Necessários (Essenciais):** Sessão de autenticação, itens da sacola/carrinho, tokens CSRF e identificador de entrega. Operam sob base legal do Art. 7º, V, sem dependência de consentimento prévio nos termos da ANPD.
  - **Opcionais (Analíticos e Preferências):** Desativados por padrão (*Privacy by Default*). Telemetria e personalizações visuais só são persistidas mediante escolha livre do usuário.
- **Banner Flutuante Minimalista:** Componente discreto (`CookieConsentBanner`), em formato de dock/pílula flutuante que nunca bloqueia a tela inteira nem impede o toque nos produtos do cardápio em celulares.
- **Autonomia Contínua:** Preferência gravada em chave local (`popclub_lgpd_consent`) com modal de reconfiguração reabrível a qualquer momento a partir do rodapé da loja (`privacyService.openPreferencesModal()`).

### 3. Direitos do Titular (Art. 18) e Retenção Fiscal (Art. 16, I)
- **Portabilidade de Dados (Art. 18, V):** Endpoint estruturado (`GET /api/users/privacy`) que gera um arquivo JSON legível por máquina contendo dados cadastrais, locais salvos, pedidos e identificação formal do Encarregado (DPO).
- **Anonimização Irreversível com 1 Clique (Art. 18, VI):** Na aba *Privacidade & LGPD* da conta do usuário (`/conta`), o titular pode solicitar a anonimização imediata da conta.
  - O sistema limpa irreversivelmente Nome, WhatsApp, E-mail, CPF, senha criptografada e remove locais salvos e notificações.
  - Os registros contábeis e fiscais dos pedidos são preservados de forma desidentificada, assegurando o cumprimento da obrigação legal tributária de fechamento de caixa da loja (**Art. 16, inciso I da LGPD**).
- **Marco Civil da Internet (Art. 15):** Guarda de registros de conexão e acesso pelo prazo legal estrito de 6 (seis) meses.
- **Canal Oficial do Encarregado (DPO — Art. 41):** `privacidade@popshake.com.br` com página pública informativa detalhada em [`/privacidade`](https://popshake.wnzk.dev.br/privacidade) e [`/termos`](https://popshake.wnzk.dev.br/termos).

---

## 💻 Stack Tecnológica

| Camada | Tecnologias Principais |
| :--- | :--- |
| **Frontend** | [Next.js 16](https://nextjs.org/) (App Router, Standalone), [React 19](https://react.dev/), [TypeScript 5](https://www.typescriptlang.org/), [Tailwind CSS 3.4](https://tailwindcss.com/), [Shadcn UI](https://ui.shadcn.com/) (`@base-ui/react`), [Lucide React](https://lucide.dev/) |
| **PWA & Offline** | [`@ducanh2912/next-pwa`](https://github.com/DuCanhGH/next-pwa), Service Workers, Workbox Caching, Web Manifest |
| **Backend & APIs** | Next.js Route Handlers RESTful, Server Actions, [Zod](https://zod.dev/) |
| **Banco de Dados & ORM** | [PostgreSQL 16](https://www.postgresql.org/) (Alpine), [Prisma ORM 6](https://www.prisma.io/) com modelagem relacional estrita |
| **Segurança & Auth** | JWT (`jsonwebtoken`), Criptografia com `bcryptjs`, Cookies `HttpOnly` com validação de papéis (`admin` vs `client`) |
| **Geolocalização & Mapas** | [Leaflet](https://leafletjs.com/) (`leaflet` + `react-leaflet`), [OpenStreetMap](https://www.openstreetmap.org/), [OSRM Routing](https://project-osrm.org/) e Nominatim Geocoding (100% Soberano & Gratuito) |
| **Infraestrutura & GitOps** | Docker (Multi-stage Debian bookworm-slim), Docker Compose, Portainer CE, Traefik v3, Authelia, Cloudflare, Tailscale |

---

## 🚀 Setup de Desenvolvimento Local

O projeto foi arquitetado para permitir execução imediata tanto de forma **100% local e autônoma** (sem qualquer dependência de rede externa para avaliadores e bancas) quanto com **paridade absoluta** consumindo a VPS da equipe:

### 1. Pré-requisitos
- [Node.js](https://nodejs.org/) versão 20 LTS ou superior.
- [Docker](https://www.docker.com/) e Docker Compose instalados.
- [Git](https://git-scm.com/) para clonagem do repositório.

---

### Opção A: Execução Local 100% Autônoma e Isolada (Recomendado para Avaliação)
Permite subir um container isolado do PostgreSQL, aplicar o schema e rodar o sistema localmente em qualquer computador:

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

# 5. Sincronizar o schema relacional e popular o banco com dados de teste (seed)
npx prisma db push
npx prisma db seed

# 6. Iniciar a aplicação em modo desenvolvimento
npm run dev
```

Acesse a vitrine em [http://localhost:3000](http://localhost:3000) e a área de gestão em [http://localhost:3000/admin](http://localhost:3000/admin).

---

### Opção B: Centralização com Paridade Absoluta (Tailscale VPN)
Utilizada no fluxo de engenharia da equipe para consumir os dados reais da sorveteria sem divergência de ambiente (*environment drift*):
```bash
# 1. Conectar à malha privada segura da VPS
tailscale up

# 2. Configurar o .env apontando para o IP da VPS
# DATABASE_URL="postgresql://postgres:SUA_SENHA@100.127.79.49:5432/popclub?schema=public"

# 3. Gerar os tipos do Prisma e iniciar
npx prisma generate
npm run dev
```

---

## 🛠️ Scripts Operacionais e Manutenção

O projeto conta com ferramentas integradas de verificação, teste e manutenção:

| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia o servidor local Next.js com live reload em todas as interfaces de rede. |
| `npm run build` | Compilação estrita de produção (TypeScript check, bundler SWC e modo standalone). |
| `npm run lint` | Executa a análise estática com o ESLint configurado para Next.js (0 erros). |
| `npm test` | **Suíte de Testes Automatizados (Vitest)**: executa 120 testes unitários e de integração (LGPD, cookies, isolamento IDOR, horários, RBAC, AppSec, estoque, esteira e financeiro). |
| `npm run test:watch` | Executa a suíte Vitest em modo interativo contínuo (TDD). |
| `npm run test:coverage` | Gera o relatório de cobertura de código automatizado (`@vitest/coverage-v8`). |
| `npx tsc --noEmit` | **Typecheck Estrito**: valida 100% da tipagem estática sem emitir artefatos. |
| `npx prisma generate` | Regenera o cliente tipado `@prisma/client` a partir do schema relacional. |
| `node scripts/smoke-test-all.mjs` | **Suíte E2E em Produção**: executa 18 testes ponta a ponta (Auth, Vitrine, Pedidos, Cupons). |
| `node scripts/diagnose-db.mjs` | Diagnóstico de latência de rede, contagem de registros e verificação das rotas de API. |
| `node scripts/backup-db.mjs` | **Backup de Segurança**: clona dados no servidor VPS (Slots 1 e 2, max 2 backups). |
| `node scripts/restore-db.mjs <1\|2>` | **Restauração de Desastre**: recupera dados a partir de um dos slots com rollback atômico. |
| `node scripts/utils/reset-admin.mjs` | Redefine ou reinjeta a senha do usuário Administrador oficial (`admin@popclub.com`). |
| `node scripts/utils/transfer-db.mjs` | Utilitário relacional para exportação e importação de dados entre instâncias PostgreSQL. |

### 🛡️ Política de Backup do Banco de Dados (Regra de Ouro)

> [!WARNING]
> **SEMPRE REALIZE UM BACKUP ANTES DE QUALQUER OPERAÇÃO CRÍTICA OU MIGRAÇÃO!**
> Para evitar perda de dados por falha humana, novas migrations ou refatorações estruturais, execute o backup preventivo.

- **Limite Estrito de 2 Backups:** O sistema gerencia uma política de **retenção máxima de 2 backups** via rotação automática (FIFO):
  - **No Servidor VPS (PostgreSQL):** Os dados são clonados em schemas dedicados (`backup_slot_1` e `backup_slot_2`). Ao executar um terceiro backup, o mais antigo é sobrescrito automaticamente.
  - **Em Arquivo Local:** Gera e mantém no máximo 2 dumps JSON em `/backups` (apagando os mais antigos automaticamente).
- **Criar Backup:**
  ```bash
  node scripts/backup-db.mjs
  # ou via npm:
  npm run db:backup
  ```
- **Restaurar Backup (caso algo dê errado):**
  ```bash
  node scripts/restore-db.mjs 1
  # ou
  node scripts/restore-db.mjs 2
  ```

> Detalhes adicionais sobre os utilitários estão disponíveis em [scripts/README.md](file:///home/wiltongx/Projetos/PastePopClub/PopClub/scripts/README.md).

---

## 🔄 Governança GitOps & Ciclo de Deploy

O repositório opera estritamente sob as diretrizes documentadas em [GITOPS.md](file:///home/wiltongx/Projetos/PastePopClub/PopClub/GITOPS.md):

1. **Single Source of Truth:** A branch **`main`** no GitHub é a única fonte da verdade. É expressamente proibido fazer alterações manuais de arquivos, schemas ou código diretamente nos containers ou no servidor de produção.
2. **Ciclo Obrigatório de Alteração (Quality Gate Pré-Push):**
   ```bash
   # 1. Typecheck estrito TypeScript
   npx tsc --noEmit

   # 2. Executar suíte completa de testes automatizados (100 testes)
   npm test

   # 3. Validar compilação de produção
   npm run build

   # 4. Commit semântico e envio
   git add .
   git commit -m "feat/fix: descrição sucinta da alteração"
   git push origin main
   ```
3. **Pipeline de CI/CD (GitHub Actions):** Ao receber o push em `main`, o workflow automatizado compila a imagem Docker multi-stage (Node.js 20 bookworm-slim com `--legacy-peer-deps`) e publica as tags `:latest` e `:${{ github.sha }}` no **GitHub Container Registry (GHCR)**.
4. **Deploy Automatizado (Portainer CE):** No Portainer, a stack em produção efetua o pull da nova imagem e recria o container. O script `entrypoint.sh` executa as migrações automáticas do banco via Prisma antes de iniciar o runtime Next.js Standalone, garantindo zero downtime.

---

## 📦 Módulos da Aplicação

### 1. Storefront & Experiência do Cliente (PWA)
- **Design Adaptativo & Temas:** Paleta exclusiva Pop Shake, suporte nativo a Dark Mode persistente (WCAG AA) e interface mobile touch-first.
- **Categorias & Carrossel Rotativo:** Visualização em carrossel rotativo fluido com fotos otimizadas em WebP pelo servidor (`sharp`) e ordenação customizável.
- **Motor de Urgência & Escassez:** Banners interativos com contadores regressivos para combos e promoções limitadas, impulsionando a conversão de pedidos.
- **Transparência de Horários & Status da Loja:** Cálculo dinâmico em tempo real do status de abertura (Aberto, Fechado ou Pausa Operacional). Informa ao consumidor o horário exato da próxima abertura e bloqueia o checkout preventivamente quando fechado.
- **Geolocalização & Frete:** Detecção de endereço assistida por GPS com Leaflet, OpenStreetMap e roteamento OSRM 100% gratuito e soberano.
- **Acesso Rápido (*Fast Access*):** Modal de checkout ultra-rápido sem necessidade de formulários burocráticos prévios.

### 2. Esteira Kanban de Cozinha & Triagem de Pedidos
- **Quadro de Produção em Tempo Real:** Colunas dinâmicas (*Pendentes*, *Em Preparo*, *Prontos*, *Em Rota* e *Concluídos*).
- **Pausa Emergencial da Esteira:** Interruptor no painel operacional (`conveyorActive`) para contenção de sobrecarga na cozinha, informando o cliente com mensagens amigáveis na vitrine.
- **Alerta Sonoro Nativo:** Notificação sonora contínua em novos pedidos via Web Audio API (sino de cozinha).
- **Impressão Térmica ESC/POS:** Geração de comandas de produção otimizadas para impressoras térmicas de 80mm e 58mm.

### 3. Logística de Entrega (WhatsApp & Telemetria)
- **Despacho Ágil via WhatsApp:** Envio instantâneo dos detalhes do pedido para o WhatsApp do entregador selecionado com rota no Google Maps e valores a cobrar.
- **Telemetria GPS ao Vivo:** Rastreamento aberto para o consumidor final via token seguro e único (`/entrega/[token]`), permitindo acompanhar a localização do motoboy em tempo real.

### 4. Gestão de Turnos & Fechamento de Caixa (Shifts)
- **Controle de Sessões de Caixa:** Abertura e fechamento de turnos com contagem cega de valores por forma de pagamento (Dinheiro, PIX e Cartão).
- **Bloqueio de Fechamento com Pedidos Ativos:** Regra estrita de negócio que impede o encerramento do turno caso ainda existam comandas não finalizadas na esteira (`PENDING_ORDERS_ACTIVE`).
- **Relatórios Financeiros:** Totalizadores consolidados de faturamento, ticket médio e auditoria de cancelamentos.

### 5. Painel Administrativo
- **Métricas & Desempenho:** Gráficos interativos com volume de vendas, faturamento diário e itens mais vendidos.
- **Gestão de Horários Semanais:** Configuração precisa de horários de abertura e fechamento por dia da semana com validação de fuso horário.
- **Identidade Visual & Personalização:** Customização do tema do splash screen/loading, avatares oficiais, banners rotativos e gestão de zonas de entrega.

### 6. Engenharia de Qualidade, AppSec & Exceções de Domínio
- **Suíte de Testes Automatizados (Vitest):** Cobertura rigorosa com 120 testes unitários e de integração validando conformidade LGPD, governança de cookies, isolamento IDOR, horários, estoques, regras de precificação, RBAC e esteira.
- **Sistema Granular de Exceções de Domínio:** Tratamento padronizado de erros (`DomainException`, `handleApiError`) com códigos de erro rastreáveis e sanitização de logs para evitar vazamento de segredos.
- **Segurança Defensiva Zero Trust:** Rate limiting por IP/identificador em rotas sensíveis (Auth, Fast Access, Cupons, Checkout e Notificações) e validação estrita com Zod.

---

## 👥 Equipe e Governança

O projeto **PopClub** é desenvolvido no âmbito da **Equipe ADP**, com responsabilidades distribuídas de acordo com a atuação principal de cada integrante. Algumas atividades, como testes, validações e apresentações, são realizadas de forma colaborativa pela equipe.

### Funções Atuais

- **Wilton Gabriel Albuquerque Pereira — Arquiteto de Software & Mantenedor Principal**
  Responsável pela arquitetura da solução, desenvolvimento e implementação do sistema, decisões técnicas, manutenção e evolução do código-fonte. Atua também como referência responsável pela coordenação técnica, administração e manutenção do repositório, organização do código, integração de contribuições e continuidade da plataforma, bem como pela gestão das autorizações relacionadas ao software, seu uso e sua evolução.

- **Adriel Felipe — Analista de Documentação**
  Responsável pela elaboração e organização da documentação do projeto, materiais de apoio, registros e preparação dos conteúdos utilizados nas entregas e apresentações.

- **João Lucas — Analista de Qualidade & Relacionamento**
  Responsável pela validação funcional da aplicação, apoio aos testes, levantamento e comunicação de problemas identificados durante a utilização e relacionamento com a parte interessada.

### Atividades Compartilhadas

A equipe participa, conforme a necessidade do projeto, de atividades como:

* testes e validação das funcionalidades;
* identificação e comunicação de problemas;
* preparação e realização de apresentações;
* revisão de materiais e documentação;
* levantamento e discussão de requisitos;
* acompanhamento das entregas.

A distribuição das atividades acima não altera as responsabilidades principais atribuídas a cada função.

### Diretrizes de Projeto e Licenciamento
- **Natureza do Repositório:** Privado e restrito (não open-source).
- **Licenciamento e Direitos:** Questões definitivas de licenciamento, direitos de uso e exploração do software serão formalizadas posteriormente por meio de instrumento próprio adequado. Componentes e bibliotecas de terceiros utilizados no ecossistema permanecem sujeitos às suas respectivas licenças de código aberto.



---
