# PopClub — Pop Shake Delivery PWA & Gestão Operacional

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Standalone-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Traefik](https://img.shields.io/badge/Traefik-v3-24A1C1?style=for-the-badge&logo=traefik&logoColor=white)
![Tailscale](https://img.shields.io/badge/Tailscale-Mesh%20VPN-49647C?style=for-the-badge&logo=tailscale&logoColor=white)

<br/>

**Plataforma proprietária de delivery, esteira de produção Kanban e gestão operacional para açaís e sorvetes artesanais.**

[Visão Geral](#-visão-geral) • [Topologia](#-topologia-de-arquitetura) • [Stack](#-stack-tecnológica) • [Setup Local](#-setup-de-desenvolvimento-local) • [Scripts](#-scripts-operacionais) • [GitOps](#-governança-gitops) • [Módulos](#-módulos-da-aplicação) • [Equipe e Governança](#-equipe-e-governança)

</div>

---

> [!NOTE]
> **REPOSITÓRIO PRIVADO — USO RESTRITO**
> Código-fonte e documentação de acesso restrito no âmbito do projeto. Este software não é de código aberto (open-source) e seu uso, reprodução ou distribuição dependem de autorização prévia.

---

## 🍨 Visão Geral

O **PopClub (Pop Shake Delivery)** é um ecossistema full-stack projetado especificamente para as demandas de alta rotatividade de sorveterias e açaíterias. O sistema une a ponta do consumidor à operação industrial da cozinha:

1. **Experiência do Consumidor (PWA):** Catálogo dinâmico, cálculo automático de frete por geolocalização GPS, temas Claro/Escuro, montagem de itens sob medida, cupons e acompanhamento em tempo real.
2. **Esteira de Produção da Cozinha (Kanban):** Painel operacional em tempo real com alertas sonoros automáticos, barra de triagem de pedidos, cálculo dinâmico de tempo de entrega e impressão térmica de comandas (ESC/POS 80mm/58mm).
3. **Gestão e Controle de Turnos:** Abertura e fechamento de turnos com auditoria cega de caixa (dinheiro, cartão e PIX), relatório financeiro diário e métricas de desempenho.
4. **Administração e Gestão de Cardápio:** Edição em tempo real de produtos, categorias, selos de destaque, banners, avatares e notificações.

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
    Traefik -->|"Roteador Seguro HTTPS :3000"| App
    App -->|"Rede Interna Bridge"| DB

    %% Desenvolvimento Conectado Diretamente
    Dev -->|"Tailscale 100.127.79.49:5432"| DB
```

Para uma análise aprofundada dos roteadores, regras de WAF e isolamento de rede, consulte o documento técnico [docs/ARCHITECTURE.md](file:///home/wiltongx/Projetos/PastePopClub/PopClub/docs/ARCHITECTURE.md).

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

## 💻 Stack Tecnológica

| Camada | Tecnologias Principais |
| :--- | :--- |
| **Frontend** | [Next.js 16](https://nextjs.org/) (App Router, Standalone), [React 19](https://react.dev/), [TypeScript 5](https://www.typescriptlang.org/), [Tailwind CSS 3.4](https://tailwindcss.com/), [Shadcn UI](https://ui.shadcn.com/) (`@base-ui/react`), [Lucide React](https://lucide.dev/) |
| **PWA & Offline** | [`@ducanh2912/next-pwa`](https://github.com/DuCanhGH/next-pwa), Service Workers, Workbox Caching, Web Manifest |
| **Backend & APIs** | Next.js Route Handlers RESTful, Server Actions, [Zod](https://zod.dev/) |
| **Banco de Dados & ORM** | [PostgreSQL 16](https://www.postgresql.org/) (Alpine), [Prisma ORM 6](https://www.prisma.io/) com modelagem relacional estrita |
| **Segurança & Auth** | JWT (`jsonwebtoken`), Criptografia com `bcryptjs`, Cookies `HttpOnly` com validação de papéis (`admin` vs `client`) |
| **Geolocalização & Mapas** | [Leaflet](https://leafletjs.com/) (`leaflet` + `react-leaflet`), [OpenStreetMap](https://www.openstreetmap.org/), [OSRM Routing](https://project-osrm.org/) e Nominatim Geocoding (100% Soberano & Gratuito) |
| **Infraestrutura & GitOps** | Docker (Multi-stage Debian bookworm-slim), Docker Compose, Portainer CE, Traefik v3, Cloudflare, Tailscale |

---

## 🚀 Setup de Desenvolvimento Local

O desenvolvimento local adota o princípio de **Paridade Absoluta**: a estação local consome diretamente a instância centralizada do PostgreSQL na VPS através da rede segura **Tailscale**. Não é necessário rodar containers locais de banco de dados.

### 1. Pré-requisitos
- [Node.js](https://nodejs.org/) versão 20 LTS ou superior.
- [Tailscale](https://tailscale.com/) instalado, logado e conectado à malha da VPS.

### 2. Configuração do `.env`
Crie ou ajuste o arquivo `.env` na raiz do projeto conforme o modelo abaixo:

```env
# Conexão com o PostgreSQL Remoto Centralizado (via Tailscale)
DATABASE_URL="postgresql://postgres:SUA_SENHA_AQUI@100.127.79.49:5432/popclub?schema=public"

# Chave Secreta para Sessões e Assinatura de Tokens JWT (mínimo 32 caracteres)
JWT_SECRET="sua_chave_secreta_jwt_aqui"
```

### 3. Instalação e Execução
```bash
# 1. Instalar as dependências do projeto
npm install

# 2. Sincronizar o cliente Prisma com o banco remoto
npx prisma generate

# 3. Iniciar o servidor de desenvolvimento
npm run dev
```

Acesse a aplicação no navegador em [http://localhost:3000](http://localhost:3000).

---

## 🛠️ Scripts Operacionais e Manutenção

O projeto conta com ferramentas integradas de verificação, teste e manutenção:

| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia o servidor local Next.js com live reload em todas as interfaces de rede. |
| `npm run build` | Compilação estrita de produção (TypeScript check, bundler SWC e modo standalone). |
| `npm run lint` | Executa a análise estática com o ESLint configurado para Next.js. |
| `node scripts/smoke-test-all.mjs` | **Suíte oficial de CI/CD**: executa 18 testes ponta a ponta (Auth, Vitrine, Pedidos, Cupons). |
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

1. **Single Source of Truth:** A branch **`main`** no GitHub é a única fonte da verdade. É expressamente proibido fazer alterações manuais de arquivos, schemas ou código diretamente nos containers ou no servidor.
2. **Ciclo Obrigatório de Alteração:**
   ```bash
   # 1. Executar bateria de testes integrados
   node scripts/smoke-test-all.mjs

   # 2. Validar tipos e compilação
   npm run build

   # 3. Commit semântico e envio
   git add .
   git commit -m "feat/fix: descrição sucinta da alteração"
   git push origin main
   ```
3. **Deploy Automatizado:** O Portainer detecta o novo commit na branch `main`, constrói a imagem Docker standalone, roda as migrations do banco via `entrypoint.sh` e atualiza os containers sem downtime perceptível.

---

## 📦 Módulos da Aplicação

### 1. Storefront & Experiência do Cliente (PWA)
- **Design Adaptativo & Temas:** Paleta exclusiva Pop Shake, suporte nativo a Dark Mode persistente e interface fluida para dispositivos móveis.
- **Geolocalização Automática:** Detecção de endereço via GPS com preenchimento assistido de rua, número e bairro.
- **Cardápio Inteligente:** Categorias ordenadas, selos customizáveis (`Lançamento`, `Mais Pedido`, `20% OFF`) e modal interativo com opções de recheios e tamanhos.

### 2. Esteira Kanban de Cozinha & Triagem de Pedidos
- **Quadro de Produção em Tempo Real:** Colunas dinâmicas (*Pendentes*, *Em Preparo*, *Prontos*, *Em Rota* e *Concluídos*).
- **Alerta Sonoro de Pedidos:** Notificação sonora contínua em novos pedidos para garantir tempo de resposta imediato na cozinha.
- **Impressão Térmica ESC/POS:** Geração de comandas de produção otimizadas para impressoras de 80mm e 58mm.

### 3. Gestão de Turnos & Fechamento de Caixa
- **Controle de Sessões de Caixa:** Abertura e fechamento de turnos com contagem cega de valores por forma de pagamento (Dinheiro, PIX e Cartão).
- **Relatórios Consolidados:** Totalizadores de faturamento, ticket médio e auditoria de cancelamentos por turno.

### 4. Painel Administrativo
- **Métricas Operacionais:** Gráficos de vendas, produtos com maior rotatividade e taxa de conversão de cupons.
- **Personalização Visual da Loja:** Customização de temas do loading, banners promocionais e configurações de entrega.

---

## 👥 Equipe e Governança

O projeto **PopClub** é desenvolvido no âmbito da **Equipe ADP**, com responsabilidades distribuídas de acordo com a atuação principal de cada integrante. Algumas atividades, como testes, validações e apresentações, são realizadas de forma colaborativa pela equipe.

### Funções Atuais

- **Wilton Gabriel — Arquiteto de Software & Mantenedor Principal**
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
