# Auditoria de Rate Limits e Cotas de Criação

**Data:** [Data Atual]
**Escopo:** Painel Operacional, Rotas Públicas, Uploads e Banco de Dados.
**Objetivo:** Mapear vulnerabilidades a abusos, inchaço de banco de dados e falta de limites (rate limits e cotas) no ecossistema Next.js (App Router).

---

## 1. Mapeamento de Criação e Recursos (O que pode ser criado)

### 1.1 Painel Operacional (Admin)
- **Produtos (`/api/products`):** Criação sem teto.
- **Categorias (`/api/categories`):** Criação sem teto.
- **Cupons (`/api/coupons`):** Criação sem teto.
- **Avatares (Presets) (`/api/admin/avatars`):** Criação sem teto.
- **Uploads de Mídia (`/api/upload`):** Podem ser enviados múltiplos arquivos pelo admin.
- **Notificações/Disparos (`/api/notifications`):** Criação sem limitação de frequência.
- **Banners/Destaques:** Sem trava explícita mapeada.

### 1.2 Rotas Públicas (Cliente)
- **Endereços de Entrega (`/api/users/locations`):** Um usuário logado pode criar infinitos endereços.
- **Pedidos (`/api/checkout`):** Criação de pedidos com limite simples de requisições.
- **Contas de Usuário (`/api/auth/register` & `fast-access`):** Sem proteção de rate limit contra criação em massa (botnets).
- **Recuperação de Senha (`/api/auth/forgot-password`):** Sem rate limit, suscetível a enumeramento e flood de e-mails/códigos.
- **Login e Validação de Aparelho (`/api/auth/login` & `verify-device`):** Login sem rate limit e verificação de aparelho possui apenas uma trava simples em memória (5 tentativas).

---

## 2. O que já possui limite hoje

- **Validação de Cupons (`/api/coupons/validate`):** Protegido por uma classe simples em memória (`couponLimiter`): 15 requisições por minuto.
- **Criação de Pedidos (`/api/checkout`):** Protegido pela mesma classe (`checkoutLimiter`): 10 requisições por minuto.
- **Uploads (`/api/upload`):**
  - Restrito APENAS a administradores (clientes não fazem upload, usam avatars preset).
  - Limite rigoroso de tamanho: `MAX_FILE_SIZE = 5MB`.
  - Validação rigorosa de extensões e tipos MIME permitidos.
  - Conversão/redimensionamento compulsório.
- **Verificação de Aparelho (`/api/auth/verify-device`):** Bloqueio simples em memória de 15 minutos após 5 tentativas falhas.

*Observação Técnica:* O sistema atual de rate limit (`src/lib/rateLimit.ts`) é baseado puramente na memória (Node.js `Map`). Isso significa que não funciona corretamente em ambientes Serverless ou multi-instância e não persiste após reinicializações.

---

## 3. Riscos Críticos (100% Desprotegido)

### A. Banco de Dados (Inchaço via Payload Gigante)
- **`prisma/schema.prisma`:** Nenhuma das colunas de texto (`String`) do PostgreSQL possui restrição de tamanho via ORM (ex: `@db.VarChar(255)`). Isso permite que atores mal-intencionados injetem strings de vários megabytes em nomes de produtos, nomes de clientes, descrições ou textos de notificação, estourando rapidamente o disco do servidor de banco de dados.
- O mesmo se aplica a campos `Json` (ex: `accessibilitySettings`).

### B. Rotas Públicas sem Rate Limit (Ataques DoS / Brute Force)
- **Login (`/api/auth/login`):** Sem limite de tentativas (Brute Force de senha).
- **Cadastro e Fast Access (`/api/auth/register`, `/api/auth/fast-access`):** Scripts podem criar milhares de contas fantasma por minuto.
- **Recuperação de Senha (`/api/auth/forgot-password`):** Permite disparar códigos de reset infinitamente, gerando stress ou ataques de enumeração.
- **Criação de Endereço (`/api/users/locations`):** Sem teto (ex: máximo de 10 endereços por conta). Um bot pode inserir milhares de localizações por conta.

### C. Painel Operacional (Ausência de Cotas)
- Administradores mal-intencionados, ou contas admin comprometidas, podem em um único loop criar milhares de:
  - Cupons
  - Produtos
  - Notificações de Broadcast (Loop de Spam no WebSocket)
  - Avatar Presets

---

## 4. Recomendações e Plano de Ação

### Para Banco de Dados
- **String Limits:** Definir limites explícitos de `VarChar` no Prisma, por exemplo: `@db.VarChar(100)` para nomes, `@db.VarChar(255)` para URLs, `@db.VarChar(1000)` para descrições.

### Para Rate Limits (Público)
- **Substituir o `Map` em Memória:** Mudar o rate limit de memória (Node.js) para uma solução robusta (como `@upstash/ratelimit` com Redis) ou usar proteção a nível de Edge via Cloudflare.
- **Limites Recomendados (Rotas Abertas):**
  - **Login / Register:** Máx 5 requisições por minuto por IP.
  - **Recuperação de Senha:** Máx 3 solicitações por 15 minutos por e-mail/IP.
  - **Criação de Endereços:** Cota em banco: Máximo 10 endereços ativos por `userId`.
  - **Fast Access:** Máx 10 tentativas por minuto.

### Para Cotas Operacionais (Admin)
- Implementar cotas lógicas baseadas em licenciamento/capacidade, ou no mínimo paginação e limite de inserções diárias:
  - **Produtos:** Máx. ex: 500 produtos ativos.
  - **Notificações:** Trava de *cooldown* de 5-10 minutos entre disparos massivos ("Broadcast").
  - **Cupons:** Trava de criação em lote, e rate limit na rota `/api/coupons`.