# Pop Shake Sorveteria — Plataforma Proprietária de Delivery PWA & Gestão Operacional

> [!IMPORTANT]
> **REPOSITÓRIO PRIVADO E CONFIDENCIAL**
> Este software e seu código-fonte são de propriedade estritamente privada e confidencial da **Pop Shake Sorveteria** e de **Wilton Gabriel (Equipe ADP)**. Todos os direitos são reservados. É terminantemente proibida qualquer cópia, distribuição, clonagem, reuso, engenharia reversa ou publicação não autorizada.

---

## Sumário

- [Visão Geral](#visão-geral)
- [Arquitetura e Tecnologias](#arquitetura-e-tecnologias)
- [Módulos e Funcionalidades](#módulos-e-funcionalidades)
  - [1. Storefront & Experiência do Cliente (PWA)](#1-storefront--experiência-do-cliente-pwa)
  - [2. Esteira Kanban de Cozinha & Triagem de Pedidos](#2-esteira-kanban-de-cozinha--triagem-de-pedidos)
  - [3. Gestão de Turno, Fechamento de Caixa & Histórico](#3-gestão-de-turno-fechamento-de-caixa--histórico)
  - [4. Painel Administrativo & Métricas de Vendas](#4-painel-administrativo--métricas-de-vendas)
  - [5. Modo de Edição da Vitrine (Exclusivo Desktop)](#5-modo-de-edição-da-vitrine-exclusivo-desktop)
- [Infraestrutura, Docker & Deploy Contínuo (CI/CD)](#infraestrutura-docker--deploy-contínuo-cicd)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Guia de Desenvolvimento Local](#guia-de-desenvolvimento-local)
  - [Configuração de Variáveis de Ambiente](#configuração-de-variáveis-de-ambiente)
  - [Banco de Dados & Prisma](#banco-de-dados--prisma)
  - [Execução Local](#execução-local)
  - [Build de Produção & Verificação](#build-de-produção--verificação)
- [Segurança & Boas Práticas](#segurança--boas-práticas)
- [Licença e Propriedade Intelectual](#licença-e-propriedade-intelectual)

---

## Visão Geral

A plataforma **Pop Shake Sorveteria** é um ecossistema full-stack desenvolvido especificamente para atender a operação de delivery e balcão de sorvetes, açaís e sobremesas de alta rotatividade.

O sistema integra ponta a ponta:
1. **Cliente final:** Compra intuitiva via Progressive Web App (PWA), temas Claro e Escuro, detecção de localização por GPS, cupons e acompanhamento ao vivo.
2. **Cozinha e Atendimento:** Esteira Kanban em tempo real, barra de triagem de pedidos com alerta sonoro contínuo, impressão automática de comprovantes térmicos e cálculo dinâmico de tempos de preparo.
3. **Gestão e Administração:** Controle financeiro, abertura e fechamento de turnos/caixa com conferência cega, auditoria de estoque, precificação e campanhas promocionais.

---

## Arquitetura e Tecnologias

- **Core & Framework:** [Next.js 16](https://nextjs.org/) (App Router, Server Actions, Route Handlers RESTful e compilação otimizada via Webpack).
- **Linguagem:** [TypeScript 5](https://www.typescriptlang.org/) com tipagem estrita de ponta a ponta.
- **Interface & Design System:** [React 19](https://react.dev/), [Tailwind CSS 3.4](https://tailwindcss.com/) com tokens semânticos (`#190B1A`, `#230E26`, `#9306CF`, `#940068`, `#35A340`), [Shadcn UI](https://ui.shadcn.com/) (`@base-ui/react`) e ícones vetoriais [Lucide React](https://lucide.dev/).
- **Banco de Dados & ORM:** [PostgreSQL](https://www.postgresql.org/) estruturado via [Prisma ORM 6](https://www.prisma.io/) com migrações tipadas e esquemas de validação por [Zod](https://zod.dev/).
- **PWA & Cache:** [`@ducanh2912/next-pwa`](https://github.com/DuCanhGH/next-pwa) com Service Worker para execução em modo app nativo nos smartphones.
- **Geolocalização:** Google Maps Platform API (`@vis.gl/react-google-maps`) com suporte a geocodificação reversa de coordenadas GPS para logradouros, bairros e cidades brasileiras.
- **Impressão Térmica:** Módulo nativo cliente de formatação de recibos para impressoras térmicas ESC/POS de 80mm e 58mm.
- **Autenticação & Sessões:** Criptografia com `bcryptjs` e emissão de tokens JWT seguros em cookies `HttpOnly` com validação de papéis (`admin` vs `customer`).
- **Deploy & Contêineres:** Docker multi-stage build, GitHub Packages (GHCR), Portainer CE e Traefik Reverse Proxy com certificados SSL Let's Encrypt automáticos.

---

## Módulos e Funcionalidades

### 1. Storefront & Experiência do Cliente (PWA)
* **Design Responsivo & Dark Mode Completo:** Interface adaptada para celulares, tablets e desktops, com alternância de tema persistente no `localStorage` (disponível no menu de usuário, perfil e tela `/conta`).
* **Header Mobile Otimizado:** Layout compacto e sem cortes, contendo estritamente o logotipo, chip de endereço truncado com geolocalização e botão de perfil, evitando duplicidades com a barra inferior (`BottomNav.tsx`).
* **Catálogo & Busca Inteligente:** Autocompletação instantânea de produtos com realce de termos e atalho direto para o modal de montagem.
* **Carrinho & Checkout:** Seleção de complementos, cálculo de taxa de entrega com frete grátis por valor mínimo, aplicação de cupons e captura de localização GPS de alta precisão.
* **Acompanhamento ao Vivo (`/pedidos`):** Status em tempo real do pedido com linha do tempo de entrega e canal direto de WhatsApp comercial.

### 2. Esteira Kanban de Cozinha & Triagem de Pedidos
* **Barra de Triagem de Novos Pedidos (`OrderTriageBar`):** Destaque visual superior para pedidos no estado `pending`, com cronômetro em tempo real do tempo de espera e alerta sonoro contínuo com repetição inteligente.
* **Modal de Aceite Rápido (`OrderAcceptDialog`):** Seleção de tempo estimado com presets personalizáveis (ex: `20-30 min`, `35-50 min`), entrada manual em minutos e disparo automático opcional de impressão térmica.
* **Modal de Recusa com Motivo (`OrderRejectDialog`):** Presets de justificativa de cancelamento com validação obrigatória e notificação ao cliente.
* **Compactação Granular por Coluna:** O operador pode colapsar individualmente qualquer coluna da esteira (*Pendentes*, *Preparo*, *Entrega*, *Concluídos*, *Cancelados*) para focar nos estágios críticos, com memória salva no navegador.
* **Imutabilidade de Cancelamento:** Pedidos cancelados não possuem opção de reativação indevida, garantindo consistência no estoque e relatórios financeiros.

### 3. Gestão de Turno, Fechamento de Caixa & Histórico
* **Controle de Turnos Operacionais (`shiftService`):** Abertura de caixa com valor inicial, registro de operadores e fechamento cego com contagem física por método de pagamento (Dinheiro, Pix, Cartão).
* **Bloqueio Automático de Loja Fechada:** Se o estabelecimento estiver fechado nas configurações da loja ou sem turno aberto, a vitrine exibe banner de aviso e impede finalização de novos pedidos.
* **Histórico Paginado (`/admin/historico`):** Consulta abrangente de pedidos anteriores com filtros avançados por período, status, modalidade e cliente.

### 4. Painel Administrativo & Métricas de Vendas
* **Dashboard Financeiro (`/admin`):** Métricas de faturamento bruto, ticket médio, gráficos de distribuição de pagamento e curva de vendas temporais.
* **Gerenciamento de Cardápio e Estoque:** Pausa e ativação de itens em tempo real, suporte a estoque finito ou sob demanda.
* **Configuração de Presets (`OrderFlowSettings`):** Edição dinâmica dos tempos de preparo e dos motivos pré-configurados de recusa diretamente no banco de dados.
* **Taxas de Entrega & Isenções:** Ajuste em tempo real de taxas base e valor mínimo para frete grátis.

### 5. Modo de Edição da Vitrine (Exclusivo Desktop)
* **Trava de Segurança:** A edição inline de seções da Home (arrastar blocos, trocar ordem, editar textos e banners diretamente na vitrine) é restrita a computadores e telas grandes (`>= 768px`).
* **Proteção em Dispositivos Móveis:** Em celulares e tablets, o botão de edição é ocultado e o contexto `EditModeContext` força o estado de edição para desativado, garantindo que no celular o admin visualize a loja exatamente como o cliente final, operando alterações estruturais pelo painel `/admin`.

---

## Infraestrutura, Docker & Deploy Contínuo (CI/CD)

O projeto conta com esteira automatizada de compilação e publicação em contêineres:

```
[ Push na branch 'main' ]
         │
         ▼
[ GitHub Actions: docker-build-push.yml ]
         │
         ├── Validação de Build do Next.js
         ├── Build da Imagem Docker Multi-Stage (Alpine Node 20)
         └── Push da imagem otimizada para o GHCR (ghcr.io/wiltongabriel/popclub)
         │
         ▼
[ Portainer Stack (popshake-stack.yml) ]
         │
         ├── Pull automático da nova imagem
         ├── Execução sob Traefik Reverse Proxy com SSL HTTPS
         └── Persistência do volume de mídia 'popshake_uploads'
```

### Arquivo da Stack do Portainer (`popshake-stack.yml`)
O container roda em modo `standalone` do Next.js, consumindo baixo consumo de memória (~120MB) e roteado automaticamente pelo Traefik através de labels Docker.

---

## Estrutura do Projeto

```
PopClub/
├── prisma/
│   ├── schema.prisma              # Modelagem relacional Prisma (PostgreSQL)
│   └── seed.ts                    # Dados iniciais e produtos padrão para dev
├── public/
│   ├── icon.png                   # Ícone oficial da aplicação (512x512)
│   ├── favicon.ico                # Favicon padrão
│   ├── notification.mp3           # Alarme sonoro de novo pedido
│   └── uploads/                   # Volume de imagens carregadas
├── src/
│   ├── app/
│   │   ├── page.tsx               # Vitrine pública com Header responsivo e catálogo
│   │   ├── layout.tsx             # Layout global com Providers de Tema, Auth e Cart
│   │   ├── carrinho/              # Página de Checkout e cálculo de entrega
│   │   ├── pedidos/               # Acompanhamento de pedidos ao vivo do cliente
│   │   ├── conta/                 # Perfil do cliente, endereços e alternador de tema
│   │   ├── busca/                 # Página de busca avançada com autocompletação
│   │   ├── admin/
│   │   │   ├── page.tsx           # Dashboard de métricas e configurações da loja
│   │   │   ├── pedidos/page.tsx   # Esteira Kanban com triagem de novos pedidos
│   │   │   └── historico/page.tsx # Histórico paginado de pedidos
│   │   └── api/                   # Route Handlers RESTful seguros
│   ├── components/
│   │   ├── admin/                 # Componentes da esteira, triagem, presets e modais
│   │   ├── storefront/            # Header, BottomNav, Banner, Cards de produtos
│   │   └── ui/                    # Componentes base Shadcn UI e Toasts
│   ├── contexts/                  # AuthContext, CartContext, ThemeContext, EditModeContext
│   ├── lib/                       # Prisma client singleton, impressora térmica, utilitários
│   └── services/                  # Clientes de API tipados para comunicação cliente-servidor
├── .env.example                   # Modelo limpo de variáveis de ambiente
├── Dockerfile                     # Construção multi-stage da imagem de produção
├── popshake-stack.yml             # Manifesto Docker Compose / Portainer para produção
├── package.json                   # Dependências do projeto e scripts npm
├── LICENSE                        # Licença proprietária confidencial
└── README.md                      # Documentação técnica oficial
```

---

## Guia de Desenvolvimento Local

### Configuração de Variáveis de Ambiente

Crie o arquivo local a partir do modelo:
```bash
cp .env.example .env
```

Defina os valores das chaves necessárias:
```env
# Google Maps Platform (Geocodificação e autocompletação)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="sua_chave_google_maps"

# Conexão com o Banco PostgreSQL local ou em contêiner
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/popclub?schema=public"

# Chave de assinatura para sessões JWT (mínimo de 32 caracteres)
JWT_SECRET="chave_secreta_jwt_para_desenvolvimento_local"
```

### Banco de Dados & Prisma

Inicie o PostgreSQL (ex: via Docker) e execute:
```bash
# 1. Gerar os clientes tipados do Prisma
npx prisma generate

# 2. Aplicar o esquema no banco de dados
npx prisma db push

# 3. (Opcional) Popular o banco com dados de catálogo para desenvolvimento
npx prisma db seed
```

### Execução Local

```bash
npm run dev
```
Acesse `http://localhost:3000` no seu navegador.

### Build de Produção & Verificação

Antes de qualquer deploy, valide a tipagem e gere os artefatos de produção:
```bash
# Verificação estrita de TypeScript
npx tsc --noEmit

# Lint de boas práticas e purity do React 19
npm run lint

# Compilação completa standalone do Next.js
npm run build
```

---

## Segurança & Boas Práticas

- **Proteção de Segredos:** Arquivos `.env`, `.env.local`, certificados `.pem`, chaves e dumps de dados estão rigorosamente ignorados pelo `.gitignore` e `.dockerignore`.
- **Prevenção de Acesso Indevido:** Rotas administrativas (`/admin/*`) e endpoints de mutação exigem validação de sessão em middleware/serviço com token JWT seguro em cookie `HttpOnly`.
- **Persistência de Dados de Usuários:** Uploads e arquivos de mídia da loja são gravados no volume dedicado do Docker (`popshake_uploads`), nunca descartados na recriação de contêineres.

---

## Licença e Propriedade Intelectual

Copyright © 2026 **Pop Shake Sorveteria** & **Wilton Gabriel (Equipe ADP)**. Todos os direitos reservados.

Este projeto é um software comercial estritamente privado e confidencial (Closed-Source / All Rights Reserved). Nenhuma parte desta aplicação pode ser reproduzida, copiada, clonada, distribuída ou transmitida sem a expressa e prévia autorização por escrito dos detentores dos direitos autorais.
