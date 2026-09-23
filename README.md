# PopClub / PopShake - Delivery & E-commerce Platform

## Visão Geral
A plataforma **PopClub** (front-end do **PopShake**) é uma aplicação PWA de e-commerce e delivery otimizada para o setor de sorveterias. Com ela, os clientes podem fazer pedidos de forma rápida e engajadora, enquanto a administração tem controle completo sobre o catálogo, promoções, rastreamento de entregas ao vivo e campanhas de marketing.

## Stack Tecnológica
- **Framework:** Next.js (App Router)
- **Linguagem:** TypeScript
- **Banco de Dados:** PostgreSQL
- **ORM:** Prisma ORM
- **Estilização:** Tailwind CSS + Shadcn UI
- **Mapas e Logística:** Leaflet.js

## Arquitetura de Autenticação e Segurança (RBAC)
A plataforma possui um sistema de autenticação progressiva e nativa que **elimina a necessidade de proxies externos (como Authelia)**:
1. **Acesso Rápido:** Acesso baseado em WhatsApp. Reduz a fricção ao mínimo para clientes efetuarem o primeiro pedido de entrega.
2. **Completar Cadastro:** O usuário adiciona E-mail e Senha para liberar benefícios (cupons e avatares) e sincronização multi-dispositivo.
3. **Roles (RBAC):** Os endpoints em `/api/admin/*` validam as funções (`ADMIN`, `OPERATOR`) com Middleware duplo (Verificação antecipada JWT e Validação de Route Handler com `getAuthUser`).
4. **Proteção BOLA/IDOR:** Mutáveis operacionais como pedidos exigem pertencimento real (ID do cliente === ID da criação do pedido) para impedir consultas não autorizadas.
5. **Rate Limiting:** Defesas aplicadas em áreas críticas (`/api/checkout`, `/api/coupons/validate`).

## Configuração de Desenvolvimento e Instalação

```bash
# 1. Instalar as dependências
npm install

# 2. Configurar o banco de dados e variáveis de ambiente
cp .env.example .env
# Edite as variáveis DATABASE_URL, NEXTAUTH_SECRET, JWT_SECRET etc

# 3. Gerar o client do Prisma e rodar migrações
npx prisma generate
npx prisma db push

# 4. Rodar o servidor de desenvolvimento
npm run dev &
```

## Scripts e Testes de Validação

- `npm run dev &`: Inicia o ambiente Next.js localmente.
- `npx tsc --noEmit`: Checa tipos em toda a aplicação.
- `npx tsx scripts/security-tests.ts`: Roda suite de testes lógicos e sanitizações de segurança.
- `npm run build`: Compila o app para produção.

> Dica: Este sistema é resiliente e contém proteções contra perda de dados offline nas consultas usando um custom handler fetch.

## Contribuição
1. Crie uma branch com o nome da feature (`feature/nome-da-feature`).
2. Siga as convenções de lint e padronização (execute `npm run lint`).
3. Nunca insira chaves reais (Tokens/API Keys) no código-fonte.
