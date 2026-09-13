# Pop Shake Sorveteria — Plataforma de Delivery PWA

Plataforma integrada de delivery, gestão operacional de pedidos e cardápio digital desenvolvida pela **Equipe ADP** para a **Pop Shake Sorveteria**. O sistema conecta a experiência de compra do cliente em formato Progressive Web App (PWA) a um painel administrativo em tempo real com esteira Kanban de cozinha, controle de estoque e inteligência de vendas.

---

## Sumário

- [Visão Geral](#visão-geral)
- [Arquitetura e Tecnologias](#arquitetura-e-tecnologias)
- [Funcionalidades da Aplicação](#funcionalidades-da-aplicação)
  - [Vitrine e Experiência do Cliente](#vitrine-e-experiência-do-cliente)
  - [Painel Operacional e Administrativo](#painel-operacional-e-administrativo)
- [Estrutura de Diretórios](#estrutura-de-diretórios)
- [Guia de Instalação e Execução](#guia-de-instalação-e-execução)
  - [Pré-requisitos](#pré-requisitos)
  - [Configuração de Ambiente](#configuração-de-ambiente)
  - [Banco de Dados e Seed Oficial](#banco-de-dados-e-seed-oficial)
  - [Execução em Desenvolvimento](#execução-em-desenvolvimento)
  - [Compilação de Produção](#compilação-de-produção)
- [Licença e Propriedade](#licença-e-propriedade)

---

## Visão Geral

A plataforma foi concebida para atender à demanda de uma sorveteria e açaiteria de alta rotatividade, combinando:

1. **Storefront PWA Responsivo:** Acesso multiplataforma (desktop, tablet e mobile) com suporte a instalação na tela de início, tema Claro padronizado, busca com autocompletação instantânea e checkout dinâmico.
2. **Esteira de Pedidos em Tempo Real (Kanban):** Painel de cozinha e expedição com colunas operacionais (*Pendentes*, *Em Preparo*, *A Caminho*, *Entregues* e *Cancelados*), alertas sonoros e cálculo de tempo decorrido.
3. **Gestão Centralizada da Operação:** Controle de estoque com suporte a itens sob demanda/finitos, criação de combos promocionais, cupons de desconto, banners editáveis e gráficos de métricas financeiras.

---

## Arquitetura e Tecnologias

A aplicação utiliza uma arquitetura full-stack orientada a componentes no Next.js (App Router), com tipagem estrita em TypeScript e comunicação persistente via banco relacional:

- **Core & Framework:** [Next.js 16](https://nextjs.org/) (App Router, Webpack/Turbopack, Server Actions e Route Handlers RESTful).
- **Linguagem:** [TypeScript 5](https://www.typescriptlang.org/) com checagem estrita de tipos em tempo de compilação.
- **Frontend & Estilização:** [React 19](https://react.dev/), [Tailwind CSS 3.4](https://tailwindcss.com/), [Shadcn UI](https://ui.shadcn.com/) (`@base-ui/react`), e ícones vetoriais [Lucide React](https://lucide.dev/).
- **Camada de Dados & Persistência:** [PostgreSQL](https://www.postgresql.org/) gerenciado via [Prisma ORM 6](https://www.prisma.io/) com esquema relacional tipado e validação por esquemas [Zod](https://zod.dev/).
- **PWA & Cache:** [`@ducanh2912/next-pwa`](https://github.com/DuCanhGH/next-pwa) para geração de Service Worker, cache inteligente de assets estáticos e manifesto para navegadores móveis.
- **Geolocalização & Mapas:** Google Maps Platform API (`@vis.gl/react-google-maps`) para geocodificação reversa de endereços e estimativa de entrega.
- **Gráficos & Visualização de Dados:** [Recharts 3](https://recharts.org/) com relatórios interativos de faturamento, ticket médio e volume de itens.
- **Segurança & Autenticação:** Criptografia de senhas com `bcryptjs` e sessões assinadas via tokens JWT (`jsonwebtoken`) transmitidos em cookies `HttpOnly`.

---

## Funcionalidades da Aplicação

### Vitrine e Experiência do Cliente

- **Catálogo Oficial:** Categorização fluida (*Destaques & Novidades*, *Linha Hits & Marmitas*, *Açaí Tradicional*, *Explosão de Recheio*, *Combos Família*, *Sorvetes Artesanais*).
- **Busca Instantânea:** Componente de busca rápida com autocompletação em tempo real, filtros por categoria e atalho para adição direta ao pedido.
- **Checkout com Geolocalização:** Botão de captura da localização atual via GPS com resolução reversa automática de logradouro, número, bairro e cidade.
- **Cálculo de Entrega Dinâmico:** Taxa padrão de entrega configurável pelo lojista e isenção automática de frete ao atingir valor mínimo de pedido.
- **Motor de Cupons:** Validação de cupons percentuais e de valor fixo, regras de pedido mínimo e contagem de utilizações.
- **Canal Oficial de Atendimento:** Botão flutuante integrado ao WhatsApp comercial da sorveteria, redirecionando com mensagem pré-configurada.
- **Acompanhamento de Pedidos:** Rastreamento do status do pedido pelo cliente em tempo real com detalhamento de itens, subtotal e endereço.

### Painel Operacional e Administrativo

- **Esteira Kanban de Pedidos (`/admin/pedidos`):**
  - Monitoramento visual de todos os pedidos ativos.
  - Transição de status em um clique com atualização imediata.
  - Abertura de gaveta com ficha técnica detalhada do pedido.
  - Contato direto com o cliente via link de WhatsApp formatado.
  - Cancelamento formal com registro obrigatório de motivo.
- **Métricas & Indicadores de Vendas (`/admin`):**
  - Faturamento bruto, ticket médio e taxa de conversão.
  - Gráficos de receita por período (*Hoje*, *7 Dias*, *Este Mês*, *Este Ano*, *Todo o Período*).
  - Divisão de métodos de pagamento (Pix, Cartão, Dinheiro) e modalidades (Delivery vs Retirada).
  - Ranking dos produtos mais vendidos da casa.
- **Controle de Estoque & Disponibilidade:**
  - Alternância imediata de itens ativos/pausados na loja.
  - Suporte a estoque sob demanda (infinito) ou contagem de unidades finitas.
  - Monitoramento de demanda ativa na cozinha por produto.
- **Gestão de Marketing:**
  - Montador de Combos com precificação original vs promocional.
  - Campanhas promocionais com gradientes customizáveis.
  - Faixa comercial editável em tempo real diretamente na Home pelo lojista.

---

## Estrutura de Diretórios

```
PopClub/
├── prisma/
│   ├── schema.prisma          # Esquema relacional Prisma (PostgreSQL)
│   └── seed.ts                # Seed oficial (21 produtos, categorias, clientes e 105 pedidos)
├── public/
│   ├── favicon.ico            # Favicon oficial
│   ├── icon.png               # Ícone da aplicação (512x512)
│   ├── icon-192x192.png       # Ícone PWA (192x192)
│   ├── icon-512x512.png       # Ícone PWA (512x512)
│   └── sw.js                  # Service Worker gerado pelo Next-PWA
├── src/
│   ├── app/
│   │   ├── (storefront)/      # Rotas públicas: /, /busca, /carrinho, /pedidos, /conta
│   │   ├── admin/             # Rotas administrativas: /admin e /admin/pedidos
│   │   ├── api/               # Route Handlers RESTful (auth, products, orders, settings, etc.)
│   │   ├── layout.tsx         # Layout raiz com providers globais e tema padrão Light
│   │   └── manifest.ts        # Manifesto PWA da Pop Shake Sorveteria
│   ├── components/
│   │   ├── admin/             # Modais, Esteira Kanban, Controle de Estoque e Dashboards
│   │   ├── storefront/        # Cabeçalho, Rodapé, Cards de Produto, Busca e Banner
│   │   └── ui/                # Primitivos de interface Shadcn UI e Notificações Toast
│   ├── contexts/              # Contextos React (Auth, Cart, Theme, EditMode)
│   ├── hooks/                 # Hooks reutilizáveis (useAuth, useCart)
│   ├── lib/                   # Utilitários, cliente Prisma singleton e criptografia
│   └── services/              # Camada de comunicação cliente-servidor (API Services)
├── .env.example               # Modelo de variáveis de ambiente
├── next.config.ts             # Configuração do Next.js, PWA e domínios remotos de imagens
├── package.json               # Dependências do projeto e scripts npm
├── tailwind.config.ts         # Tokens de design do Tailwind CSS
└── LICENSE                    # Licença proprietária comercial bilíngue
```

---

## Guia de Instalação e Execução

### Pré-requisitos

- [Node.js](https://nodejs.org/) versão `20.x` ou superior.
- Gerenciador de pacotes `npm`, `pnpm` ou `yarn`.
- Instância ativa do [PostgreSQL](https://www.postgresql.org/) (localmente ou via Docker).

### Configuração de Ambiente

1. Clone o repositório em sua máquina local:
   ```bash
   git clone https://github.com/WiltonGabriel/PopClub.git
   cd PopClub
   ```

2. Crie o arquivo de variáveis de ambiente a partir do modelo fornecido:
   ```bash
   cp .env.example .env
   ```

3. Edite as variáveis no `.env` com suas credenciais:
   ```env
   # Google Maps Platform (Geocodificação de endereços)
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="sua_chave_google_maps"

   # Conexão com o PostgreSQL
   DATABASE_URL="postgresql://usuario:senha@localhost:5432/popclub?schema=public"

   # Assinatura de tokens JWT (gerar hash seguro de no mínimo 32 caracteres)
   JWT_SECRET="sua_chave_secreta_jwt_super_segura"
   ```

### Banco de Dados e Seed Oficial

Instale as dependências e aplique a estrutura do banco de dados:

```bash
# 1. Instalar pacotes
npm install

# 2. Sincronizar tabelas no PostgreSQL via Prisma
npx prisma db push

# 3. Gerar cliente tipado do Prisma
npx prisma generate

# 4. Executar o seed completo (Produtos oficiais, categorias, admin e 105 pedidos históricos)
npx prisma db seed
```

> **Credenciais padrão do Administrador:**
> - **E-mail:** `admin@popclub.com`
> - **Senha:** `@64844048`

### Execução em Desenvolvimento

Para iniciar o servidor de desenvolvimento:

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:3000` (e nos IPs da rede local/Tailscale configurados).

### Compilação de Produção

Para validar a integridade dos tipos e gerar o bundle de produção otimizado:

```bash
# Checagem de tipagem TypeScript
npx tsc --noEmit

# Compilação completa do Next.js
npm run build

# Inicialização do servidor em produção
npm run start
```

---

## Licença e Propriedade

Copyright © 2026 **Pop Shake Sorveteria** & **Equipe ADP**. Todos os direitos reservados.

Este software é proprietário e disponibilizado sob a licença comercial **Source-Available**. O código-fonte é disponibilizado publicamente exclusivamente para fins de visualização, auditoria arquitetural e portfólio profissional. Qualquer reprodução, distribuição, modificação, sublicenciamento ou comercialização do código sem consentimento prévio e por escrito é estritamente proibida.

Para mais detalhes, consulte o arquivo [LICENSE](./LICENSE).
