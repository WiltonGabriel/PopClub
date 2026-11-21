# PopClub

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=flat-square&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748?style=flat-square&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-363%20Passed-449C44?style=flat-square&logo=vitest&logoColor=white)
![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue?style=flat-square)

**Plataforma open-source (PWA) para gestão de cardápio digital, esteira de produção Kanban em tempo real, logística de entrega e controle operacional de turnos.**

</div>

---

## O que o projeto faz

O **PopClub** é uma aplicação web full-stack desenvolvida como projeto acadêmico extensionista (UNIVAG — Tecnologia em Análise e Desenvolvimento de Sistemas) para digitalizar o fluxo completo de pedidos entre clientes, cozinha, entregadores e administração.

Este repositório distribui exclusivamente o código-fonte do software como projeto aberto sob a licença **GNU AGPL-3.0**, sem qualquer finalidade comercial de venda de licença ou produto.

## Por que o projeto é útil

- **Vitrine PWA Responsiva:** Catálogo com categorias dinâmicas, personalização granular de itens e adicionais com cotas gratuitas, temas claro/escuro e suporte a instalação como Progressive Web App (`@ducanh2912/next-pwa`).
- **Esteira de Cozinha em Tempo Real (SSE):** Painel operacional Kanban (`/admin/pedidos`) atualizado via Server-Sent Events (`/api/orders/events`), alertas sonoros via Web Audio API, pausa emergencial da esteira e impressão térmica ESC/POS (58mm/80mm).
- **Geolocalização e Logística Soberana:** Cálculo de frete e validação de raio de entrega com **Leaflet**, **OpenStreetMap**, **OSRM** e **Nominatim**, despacho estruturado via WhatsApp e rastreamento por token único (`/entrega/[token]`).
- **Controle de Turnos e Auditoria de Caixa:** Abertura e fechamento de turnos com contagem cega por meio de pagamento e bloqueio de encerramento enquanto houver pedidos ativos (`PENDING_ORDERS_ACTIVE`).
- **Segurança e Conformidade LGPD:** Autenticação nativa com JWT em cookies `HttpOnly`, rotação de chaves (`JWT_SECRET_PREVIOUS`), invalidação por `tokenVersion`, controle de acesso baseado em papéis (**RBAC**), rate limiting e fluxos de consentimento de cookies, portabilidade (`GET /api/users/privacy`) e anonimização com preservação fiscal (`DELETE /api/users/privacy`).
- **Qualidade Verificada:** 54 arquivos e 363 testes automatizados (unitários e de integração) com Vitest, além de pipeline CI/CD com ESLint e build Docker multi-stage.

## Como começar

### Pré-requisitos

- [Node.js](https://nodejs.org/) 20 LTS ou superior
- [Docker](https://www.docker.com/) e Docker Compose
- [Git](https://git-scm.com/)

### Instalação e execução local

```bash
# 1. Clonar o repositório
git clone https://github.com/WiltonGabriel/PopClub.git
cd PopClub

# 2. Instalar dependências
npm install

# 3. Subir o banco PostgreSQL 16 local isolado
docker compose -f docker-compose.dev.yml up -d

# 4. Configurar variáveis de ambiente
cp .env.example .env

# 5. Gerar cliente Prisma, sincronizar schema e popular dados de exemplo
npx prisma generate
npx prisma db push
npx prisma db seed

# 6. Iniciar o servidor de desenvolvimento
npm run dev
```

A aplicação ficará disponível em `http://localhost:3000` e o painel administrativo em `http://localhost:3000/admin`.

### Variáveis de ambiente principais

Consulte [`.env.example`](.env.example) para a lista completa de configuração local:

```env
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/popclub?schema=public"
JWT_SECRET="sua_chave_secreta_jwt_de_desenvolvimento_popclub_2026_minimo_32_caracteres"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Comandos de verificação e testes

```bash
# Executar suíte completa de testes (Vitest)
npm test

# Verificação estática (ESLint)
npm run lint

# Verificação de tipos TypeScript
npx tsc --noEmit

# Build de produção (Next.js Standalone)
npm run build
```

## Onde obter ajuda e documentação

- **Arquitetura e Topologia:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Fluxo GitOps e Deploy:** [docs/GITOPS.md](docs/GITOPS.md)
- **Scripts de Diagnóstico e Backup:** [scripts/README.md](scripts/README.md)
- **Levantamento de Requisitos:** [docs/DOCUMENTO_LEVANTAMENTO_REQUISITOS.md](docs/DOCUMENTO_LEVANTAMENTO_REQUISITOS.md)
- **Evidências de Validação:** [docs/EVIDENCIAS_E_FEEDBACK_CLIENTE.md](docs/EVIDENCIAS_E_FEEDBACK_CLIENTE.md)
- **Dúvidas e Bugs:** Abra uma *Issue* diretamente neste repositório do GitHub.

## Mantenedores e contribuições

O projeto é mantido pela **Equipe ADP** no âmbito do Projeto Extensionista Integrador (UNIVAG — TADS):

- **Wilton Gabriel Albuquerque Pereira** — Arquitetura de Software e Desenvolvimento Full-Stack
- **Adriel Felipe** — Documentação Técnica
- **João Lucas** — Qualidade e Validação Funcional

### Como contribuir

1. Faça um *fork* do repositório e crie uma branch para sua alteração (`git checkout -b feat/minha-contribuicao`).
2. Siga os padrões de arquitetura em camadas e clean code do projeto.
3. Garanta que `npm test`, `npm run lint` e `npm run build` executem sem erros.
4. Envie um *Pull Request* descrevendo claramente o problema resolvido e os testes adicionados.

## Licença

Este projeto é distribuído sob a licença **GNU Affero General Public License v3.0 (AGPL-3.0)**. Consulte o arquivo [LICENSE](LICENSE) para os termos completos.
