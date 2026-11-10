# Arquitetura em Camadas e Contratos — PopClub

Este documento mapeia as camadas arquiteturais do projeto PopClub, os limites de responsabilidade de cada diretório e as regras de dependência entre eles.

---

## 1. Mapa de Camadas do Projeto

```
src/
├── app/
│   ├── api/                    # [Camada de Apresentação / Rotas HTTP]
│   │   ├── admin/              # Endpoints administrativos protegidos por RBAC
│   │   ├── auth/               # Autenticação, sessão, tokens e verificação
│   │   ├── orders/             # Endpoints de ciclo de vida de pedidos
│   │   ├── products/           # Catálogo, status de itens e estoque
│   │   └── ...
│   └── (pages / UI)            # Páginas Next.js (App Router), Server/Client Components
│
├── services/                   # [Camada de Aplicação]
│   ├── shiftService.ts         # Orquestração de turnos de operadores
│   ├── shippingService.ts      # Integração e orquestração de frete/entregadores
│   ├── privacyService.ts       # Orquestração de conformidade LGPD e exclusão de dados
│   └── ...
│
├── domain/                     # [Camada de Domínio / Regras de Negócio Puras]
│   ├── errors/                 # DomainException e subclasses padronizadas
│   ├── services/               # Calculadoras puras (carrinho, estoque, cupons, turnos)
│   └── ...
│
├── lib/                        # [Camada de Infraestrutura e Utilitários]
│   ├── prisma.ts               # Conexão com banco PostgreSQL via Prisma Client
│   ├── auth.ts                 # Assinatura JWT, verificação de hash bcrypt, cookies
│   ├── permissions.ts          # Definições de papéis (Role) e permissões granulares RBAC
│   ├── api-error-handler.ts    # Conversão segura de exceções em JSON responses HTTP
│   ├── rateLimit.ts            # Rate limiting em memória com TTL e janelas de requisição
│   ├── logger.ts               # Sistema estruturado de logs com mascaramento de dados
│   └── validations/            # Schemas Zod de validação de DTOs e formulários
│
└── components/                 # Componentes React visuais (UI / shadcn / tailwind)
```

---

## 2. Regras de Dependência Entre Camadas

1. **Apresentação (`app/api`)**:
   - Pode depender de: `services/`, `domain/`, `lib/validations/`, `lib/auth.ts`, `lib/api-error-handler.ts`.
   - **NÃO DEVE**: Conter queries SQL/Prisma complexas diretamente, nem lógica matemática de domínio.
   
2. **Aplicação (`services/`)**:
   - Pode depender de: `domain/`, `lib/prisma.ts`, `lib/logger.ts`.
   - **NÃO DEVE**: Conter dependência direta do objeto `Request`/`Response` do Next.js ou headers HTTP.

3. **Domínio (`domain/`)**:
   - Camada mais interna e limpa.
   - Pode depender de: Nada fora de si mesma (funções puras, objetos de valor, tipos TypeScript).
   - **NÃO DEVE**: Importar `prisma`, bibliotecas de I/O, `NextResponse`, etc.

4. **Infraestrutura (`lib/`)**:
   - Fornece suporte técnico às demais camadas (persistência, criptografia, logging).

---

## 3. Contratos de Entrada e Saída (DTOs)

- Toda entrada de API deve ser validada por um schema Zod em `src/lib/validations/`.
- Os retornos devem obedecer DTOs bem definidos. Nunca retorne entidades cruas do Prisma com campos sensíveis (como `passwordHash`, `twoFactorSecret`, etc.) para o frontend.
