# Arquitetura de Segurança — PopClub

Este documento descreve os controles de segurança implementados no PopClub seguindo defesa em profundidade (*Zero Trust* nativo na aplicação) e conformidade com a LGPD.

---

## 1. Autenticação, Sessões e Criptografia

- **Senhas:** Armazenadas exclusivamente como hash `bcryptjs` (custo 10). Nenhum endpoint retorna `passwordHash`.
- **Tokens JWT e Cookies:** Assinados com `JWT_SECRET` (obrigatório em produção — ausência lança erro fatal em `src/lib/auth.ts`) e enviados em cookies `HttpOnly`, `SameSite=Lax` e `Secure` em HTTPS.
- **Rotação sem Downtime (`JWT_SECRET_PREVIOUS`):** O verificador aceita a chave primária e, em transição, a chave anterior (`JWT_SECRET_PREVIOUS`), permitindo rotação em produção sem invalidar sessões ativas imediatamente.
- **Revogação Instantânea (`tokenVersion`):** Toda alteração de senha, cargo, permissões ou desativação de conta incrementa `tokenVersion` no PostgreSQL. Tokens antigos com versão divergente ou ausente são recusados imediatamente em `getAuthUser()`.
- **Proteção Anti-Takeover no Acesso Rápido:** Contas registradas com senha (`isRegistered=true` ou `passwordHash != null`) são bloqueadas nos fluxos sem senha (`/api/auth/fast-access` e `/api/auth/verify-device` retornam `HTTP 403`).

---

## 2. Proteção de Borda e Autorização (RBAC)

- **Middleware/Proxy de Borda (`src/proxy.ts`):** Intercepta `/admin` e `/admin/*` via Web Crypto API (HMAC-SHA256). Requisições sem sessão válida ou de perfil `CLIENT` são redirecionadas para `/login`. A rota `/admin/usuarios` é restrita a `ADMIN`.
- **Autorização Granular em Route Handlers (`src/lib/permissions.ts`):**
  - `ADMIN`: acesso irrestrito.
  - `EDITOR`: permissões herdadas de `customRole` e/ou `permissions` explícitas, validadas contra whitelist fechada (`PERMISSION_KEYS`).
  - **Prevenção de Escalonamento de Privilégios:** Um `EDITOR` com `users_manage` não pode criar membros de equipe, editar/bloquear contas `ADMIN`/`EDITOR`, nem criar/alterar `CustomRole` (`HTTP 403`).
- **Auditoria Imutável (`AdminAuditLog`):** Ações administrativas sensíveis gravam trilha de auditoria com sanitização recursiva de PII/tokens (`src/services/auditLogService.ts`). A API `/api/admin/audit-logs` permite somente `GET` para `ADMIN` e retorna `HTTP 405` em `POST`/`PUT`/`PATCH`/`DELETE`.

---

## 3. Blindagem Anti-Tampering, Anti-IDOR/BOLA e Rate Limiting

- **Recálculo Integral no Checkout (`/api/checkout`):** Preços unitários, descontos promocionais, adicionais gratuitos/pagos, cupons e taxa de frete (Haversine) são recalculados estritamente no servidor a partir do banco de dados, ignorando valores financeiros enviados pelo cliente.
- **Idempotência & Concorrência:** Suporte a `Idempotency-Key` no checkout (detectando colisão de payload divergente com `HTTP 409`) e constraints atômicas para `maxUses`, `oncePerUser` de cupons e turno único ativo.
- **Isolamento BOLA/IDOR:**
  - `/api/orders/[id]` exige propriedade do pedido, perfil Staff autorizado ou token criptográfico válido (`trackingToken`).
  - Visitantes anônimos sem token dedicado recebem `order_pin` redigido (`null`).
  - Projeção de entregadores no Kanban omite `pixKey` quando o operador não possui `logistics_manage`.
- **Rate Limiting (`src/lib/rateLimit.ts`):** Janela deslizante em memória com headers `Retry-After` (RFC 6585) e precedência segura de IP (`cf-connecting-ip`, `x-real-ip`, `x-forwarded-for`).
- **Sanitização & Validação:** Schemas Zod, sanitização anti-XSS (`sanitizeText`/`sanitizePayload`), validação de URLs de mídia (bloqueando `javascript:`, `data:` inseguros e SSRF local) e upload restrito a 5MB com conversão WebP pelo `sharp`.

---

## 4. Conformidade LGPD e Privacidade

- **Aceite Explícito no Cadastro:** `POST /api/auth/register` exige `acceptedTerms: true` com links diretos para `/termos` e `/privacidade`.
- **Governança de Cookies (ANPD):** Categorias opcionais desativadas por padrão (*Privacy by Default*), com reconfiguração permanente via `privacyService.openPreferencesModal()`.
- **Direitos do Titular (`/api/users/privacy`):** Portabilidade JSON (Art. 18, V) e anonimização irreversível (Art. 18, VI) com preservação fiscal desidentificada (Art. 16, I).

---

## 5. Reporte de Vulnerabilidades

Caso identifique alguma falha de segurança, **não abra uma Issue pública com detalhes exploráveis**. Entre em contato diretamente com os mantenedores do repositório ou utilize o canal de reporte privado (GitHub Security Advisories) descrevendo os passos para reprodução e o impacto estimado.
