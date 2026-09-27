# Auditoria e Implementação de Rate Limits e Cotas

**Data:** [Data Atual]
**Escopo:** Painel Operacional, Rotas Públicas, Uploads e Banco de Dados.
**Objetivo:** Mapear e implementar soluções contra abusos, inchaço de banco de dados e falta de limites (rate limits e cotas) no ecossistema Next.js (App Router).

---

## 1. Vulnerabilidades Identificadas (Auditoria Original)

Durante a auditoria inicial, mapeamos as seguintes vulnerabilidades críticas:
- **Banco de Dados (Inchaço):** Campos sem limites de caracteres no banco, permitindo injeção de payloads gigantes nas rotas de criação.
- **Rotas Públicas (DoS e Brute Force):** Falta de Rate Limiting nas rotas de Autenticação, Fast Access e Recuperação de Senha.
- **Criação Desenfreada de Endereços:** Usuários logados podiam criar milhares de endereços (`UserLocations`) sem teto.
- **Painel Operacional:** Ausência de cotas (limite máximo de registros) na criação de Produtos, Categorias, Cupons e Avatares, além da falta de um *cooldown* para disparo de Notificações em Massa (Broadcast).

---

## 2. Soluções e Limites Implementados

Para garantir a estabilidade e a blindagem do sistema contra abusos, as seguintes cotas lógicas e regras de rate limiting foram permanentemente estabelecidas e validadas:

### 2.1. Extração Segura de IP Real
Foi atualizado o módulo central de Rate Limit (`src/lib/rateLimit.ts`) para extrair corretamente o IP real dos clientes, ignorando o IP interno da infraestrutura de proxy. A checagem respeita a seguinte ordem:
1. `cf-connecting-ip` (Cloudflare)
2. `x-forwarded-for` (Traefik v3)
3. Fallback (`anonymous`)

### 2.2. Rate Limits em Rotas Públicas (Por IP)
- **Login, Cadastro e Fast Access:** 5 requisições por minuto (`authLimiter`).
- **Recuperação de Senha:** 3 solicitações a cada 15 minutos (`forgotPasswordLimiter`).
- **Validação de Cupons:** 10 tentativas por minuto (`couponLimiter`).
- **Criação de Pedidos (Checkout):** 10 tentativas por minuto (`checkoutLimiter`).

### 2.3. Cotas e Validações de Payload (Zod)
- **Endereços de Entrega (`UserLocations`):**
  - **Teto Rigoroso:** Máximo de **10 endereços cadastrados** por conta.
  - **Limites de String (Zod):** Rua e Bairro (100 char), Número, Estado e CEP (50 char), Referência e Complemento (300 char).
- **Dados do Perfil:** E-mail máximo de 255 caracteres, Nome máximo de 100 caracteres.

### 2.4. Cotas Operacionais e Travas do Painel Administrativo
Limites lógicos impostos na criação de novos recursos no banco:
- **Produtos:** Máximo de 300 produtos ativos.
  - Nomes limitados a 100 caracteres e descrições a 1000 caracteres.
- **Categorias:** Máximo de 30 categorias ativas.
  - Nomes limitados a 100 caracteres.
- **Cupons:** Máximo de 100 cupons ativos.
  - Código limitado a 100 caracteres.
- **Avatares (Presets):** Máximo de 30 presets cadastrados.
- **Notificações Broadcast (Push):**
  - Adicionado um **cooldown obrigatório de 5 minutos** entre cada envio em massa (Broadcast/All).
  - Títulos limitados a 100 caracteres e mensagens a 1000 caracteres.

### 2.5. Arquitetura "Zero Trust" Nativa
A aplicação agora aplica as restrições a nível de controlador/rota (*Route Handlers*). Essa arquitetura garante proteção independente (mesmo que provedores externos de segurança falhem, os *endpoints* rejeitarão as requisições por excesso de cota e falhas de schema/Zod).

---

## 3. Garantia do Ciclo de Vida e Liberação de Cotas (CRUD Completo)

Ao aplicarmos limites rígidos (tetos de criação), torna-se obrigatório garantir que usuários e administradores consigam liberar espaço deletando ou editando registros antigos. Todas as entidades mapeadas possuem rotas funcionais de edição e deleção:

### 3.1. Cliente
- **Endereços (`/api/users/locations/[id]`):**
  - Possui rota `DELETE` para remoção do endereço, liberando a cota dos 10 permitidos.
  - Possui rota `PATCH` para atualização dos dados ou definição de `isDefault`.

### 3.2. Painel Admin
- **Cupons (`/api/coupons/[id]`):**
  - Possui rotas `PUT` e `PATCH` para edição total ou ativação/desativação (`isActive`).
  - Possui rota `DELETE` para exclusão definitiva.
- **Categorias (`/api/categories/[id]`):**
  - Possui rota `PATCH` para atualização de nome/slug.
  - Possui rota `DELETE` para remoção.
- **Produtos (`/api/products/[id]`):**
  - Possui rota `PUT` para atualização de informações, preços e estoque.
  - Possui rota `DELETE` para exclusão definitiva do catálogo.
- **Avatares (`/api/admin/avatars/[id]`):**
  - Possui rota `PATCH` para atualização de imagem, nome, descrição, etc.
  - Possui rota `DELETE` para remoção do preset, liberando espaço no limite de 30 avatares.