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

[Visão Geral](#-visão-geral) • [Topologia](#-topologia-de-arquitetura) • [Stack](#-stack-tecnológica) • [Setup Local](#-setup-de-desenvolvimento-local) • [Scripts](#-scripts-operacionais) • [GitOps](#-governança-gitops) • [Módulos](#-módulos-da-aplicação)

</div>

---

> [!IMPORTANT]
> **REPOSITÓRIO PRIVADO E CONFIDENCIAL**  
> Este software e seu código-fonte são de propriedade estritamente privada da **Pop Shake Sorveteria** e de **Wilton Gabriel (Equipe ADP)**. Todos os direitos reservados.

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
    Client -->|HTTPS :443| CF
    CF -->|Proxy Seguro| Traefik
    Traefik -->|Roteador Público :100 (Estáticos/Manifest)| App
    Traefik -->|Roteador Protegido :1 (Authelia)| Authelia
    Authelia -->|Sessão Validada| App
    App -->|Rede Interna Bridge| DB

    %% Desenvolvimento Conectado Diretamente
    Dev -->|IP Seguro 100.127.79.49:5432| DB
```

Para uma análise aprofundada dos roteadores, regras de WAF e isolamento de rede, consulte o documento técnico [docs/ARCHITECTURE.md](file:///home/wiltongx/Projetos/PastePopClub/PopClub/docs/ARCHITECTURE.md).

---

## 💻 Stack Tecnológica

| Camada | Tecnologias Principais |
| :--- | :--- |
| **Frontend** | [Next.js 16](https://nextjs.org/) (App Router, Standalone), [React 19](https://react.dev/), [TypeScript 5](https://www.typescriptlang.org/), [Tailwind CSS 3.4](https://tailwindcss.com/), [Shadcn UI](https://ui.shadcn.com/) (`@base-ui/react`), [Lucide React](https://lucide.dev/) |
| **PWA & Offline** | [`@ducanh2912/next-pwa`](https://github.com/DuCanhGH/next-pwa), Service Workers, Workbox Caching, Web Manifest |
| **Backend & APIs** | Next.js Route Handlers RESTful, Server Actions, [Zod](https://zod.dev/) |
| **Banco de Dados & ORM** | [PostgreSQL 16](https://www.postgresql.org/) (Alpine), [Prisma ORM 6](https://www.prisma.io/) com modelagem relacional estrita |
| **Segurança & Auth** | JWT (`jsonwebtoken`), Criptografia com `bcryptjs`, Cookies `HttpOnly` com validação de papéis (`admin` vs `client`) |
| **Geolocalização** | Google Maps Platform API (`@vis.gl/react-google-maps`) com Geocodificação Reversa |
| **Infraestrutura & GitOps** | Docker (Multi-stage Debian bookworm-slim), Docker Compose, Portainer CE, Traefik v3, Authelia, Cloudflare, Tailscale |

---

## 🚀 Setup de Desenvolvimento Local

O desenvolvimento local adota o princípio de **Paridade Absoluta**: a estação local consome diretamente a instância centralizada do PostgreSQL na VPS através da rede segura **Tailscale**. Não é necessário rodar containers locais de banco de dados.

### 1. Pré-requisitos
- [Node.js](https://nodejs.org/) versão 20 LTS ou superior.
- [Tailscale](https://tailscale.com/) instalado, logado e conectado à malha da VPS.

### 2. Configuração do `.env`
Crie ou ajuste o arquivo `.env` na raiz do projeto conforme o modelo abaixo:

```env
# Google Maps Platform (Geocodificação Reversa e Autocompletação de Endereços)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=sua_chave_google_maps_aqui

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
| `node scripts/utils/reset-admin.mjs` | Redefine ou reinjeta a senha do usuário Administrador oficial (`admin@popclub.com`). |
| `node scripts/utils/transfer-db.mjs` | Utilitário relacional para exportação e importação de dados entre instâncias PostgreSQL. |

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

## 🔒 Licença e Confidencialidade

Este projeto é um ativo comercial privado. O acesso ao código-fonte é restrito exclusivamente aos mantenedores autorizados da **Pop Shake Sorveteria**.
