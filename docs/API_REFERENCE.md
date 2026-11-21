# Referência de API — PopClub

Este documento cataloga os endpoints REST e Server-Sent Events (SSE) em `src/app/api/`, seus respectivos níveis de autorização (**RBAC**) e controles de taxa (**Rate Limiting**).

---

## 1. Autenticação, Sessão e Conta (`/api/auth/*` e `/api/users/*`)

| Endpoint | Métodos | Acesso | Descrição |
| :--- | :--- | :--- | :--- |
| `/api/auth/login` | `POST` | Público (Rate Limit: 5/min por IP+identificador) | Autentica usuário cadastrado com e-mail/username e senha; emite cookie `HttpOnly` `popshake_session`. |
| `/api/auth/register` | `POST` | Público (Rate Limit: 5/min) | Cria conta completa; exige `acceptedTerms: true` (Termos de Uso e Política de Privacidade). |
| `/api/auth/fast-access` | `POST` | Público (Rate Limit: 5/min) | Acesso Rápido para clientes sem senha (nome + WhatsApp); bloqueia contas já registradas (`403`). |
| `/api/auth/complete-profile` | `POST` | Autenticado (`CLIENT`) | Promove usuário de Acesso Rápido para conta completa com e-mail e senha. |
| `/api/auth/check-phone` | `POST` | Público (Rate Limit dedicado) | Verifica existência de telefone mascarando PII para reconhecimento seguro de aparelho. |
| `/api/auth/verify-device` | `POST` | Público (Anti-brute force: 5 tentativas) | Confirma número do endereço salvo para desbloqueio de Acesso Rápido em novo aparelho. |
| `/api/auth/forgot-password` | `POST` | Público (Rate Limit: 3/15min) | Gera código temporário de recuperação de senha (6 dígitos) e envia via `emailService`. |
| `/api/auth/reset-password` | `POST` | Público | Valida código temporário, redefine senha (`bcrypt`) e incrementa `tokenVersion`. |
| `/api/auth/logout` | `POST` | Público / Autenticado | Limpa cookies de sessão (`popshake_session` e `auth_token`). |
| `/api/auth/me` | `GET` | Autenticado | Retorna perfil, permissões diretas e `customRole` validando `tokenVersion`. |
| `/api/users/profile` | `GET`, `PATCH` | Autenticado | Lê/atualiza perfil, senha e seleção de avatar (com gating por pedidos/meses). |
| `/api/users/locations` | `GET`, `POST` | Autenticado | Lista/adiciona endereços do titular (limite máximo de 10 endereços por conta). |
| `/api/users/locations/[id]` | `PATCH`, `DELETE` | Proprietário (`IDOR`) | Edita/remove endereço garantindo isolamento por `userId`. |
| `/api/users/privacy` | `GET`, `DELETE` | Autenticado | **LGPD**: Portabilidade JSON (Art. 18, V) e anonimização irreversível com preservação fiscal (Art. 16, I). |

---

## 2. Vitrine, Catálogo, Promoções e Adicionais

| Endpoint | Métodos | Acesso | Descrição |
| :--- | :--- | :--- | :--- |
| `/api/products` | `GET` | Público | Lista produtos ativos, combos e promoções vinculadas. |
| `/api/products` | `POST` | `menu_manage` | Cria novo produto ou combo com validação Zod e auditoria. |
| `/api/products/[id]` | `GET` | Público | Detalhes do produto e grupos de adicionais ordenados. |
| `/api/products/[id]` | `PUT`, `DELETE` | `menu_manage` | Atualiza/remove produto mantendo integridade referencial de pedidos. |
| `/api/products/[id]/stock` | `PATCH` | `STOCK_CONTROL` | Atualiza estoque físico ou disponibilidade na cozinha em tempo real. |
| `/api/categories` | `GET`, `POST` | Público (`GET`) / `menu_manage` (`POST`) | Gerencia categorias estáticas e dinâmicas (`HIGHLIGHTS`, `ACTIVE_PROMOTIONS`, `COMBOS`). |
| `/api/categories/[id]` | `PUT`, `DELETE` | `menu_manage` | Atualiza ou exclui categoria. |
| `/api/categories/[id]/toggle-status` | `PATCH` | `menu_manage` | Ativa/pausa categoria. |
| `/api/categories/reorder` | `PATCH` | `menu_manage` | Reordena exibição das categorias atomicamente. |
| `/api/addons/groups` & `[id]` | `GET`, `POST`, `PUT`, `DELETE` | Público (`GET`) / `menu_manage` | CRUD de grupos de complementos (cotas gratuitas, min/max, ordenação). |
| `/api/addons/items`, `[id]`, `[id]/availability` | `GET`, `POST`, `PUT`, `DELETE`, `PATCH` | Público (`GET`) / `menu_manage` ou `STOCK_CONTROL` | CRUD e pausa rápida de adicionais individuais. |
| `/api/promotions` & `[id]` | `GET`, `POST`, `PUT`, `DELETE` | Público (`GET` ativo) / `promotions_manage` (`?all=true` e mutações) | Promoções percentuais ou preço fixo, cronômetro de urgência e lotes reais. |
| `/api/banner`, `/api/badges`, `/api/tags`, `/api/avatars` | `GET`, `POST`, `PUT`, `DELETE` | Público (`GET`) / `menu_manage` ou `theme_manage` | Banners da home, selos de cards, tags e avatares públicos. |

---

## 3. Checkout, Pedidos, Tempo Real (SSE) e Turnos

| Endpoint | Métodos | Acesso | Descrição |
| :--- | :--- | :--- | :--- |
| `/api/checkout` | `POST` | Público (visitante) ou Autenticado | Cria pedido com idempotência (`Idempotency-Key`), recálculo integral no servidor (*anti-tampering*), validação de horário (`America/Cuiaba`), estoque, cupons e frete Haversine. |
| `/api/orders` | `GET` | Proprietário / Staff (`ORDERS_KANBAN`, `ORDERS_HISTORY`) / Visitante via `guestOrderIds` | Lista pedidos com redação de `order_pin` para visitantes sem token. |
| `/api/orders` | `PATCH` | Staff (`ORDERS_KANBAN`) ou Proprietário (cancelamento pré-preparo) | Transição validada por Máquina de Estados (FSM) e estorno atômico de estoque/cupons em cancelamentos. |
| `/api/orders/[id]` | `GET`, `PATCH`, `DELETE` | Proprietário / Staff / Token `?token=` | Consulta detalhada ou atualização de pedido específico com proteção anti-IDOR. |
| `/api/orders/[id]/dispatch` | `POST` | `ORDERS_KANBAN` | Associa entregador, gera PIN de entrega e transiciona para despacho. |
| `/api/orders/claim` | `POST` | Autenticado | Reivindica pedido anônimo para a conta autenticada (protegido contra race condition). |
| `/api/orders/events` | `GET` | Autenticado / Token / `guestOrderIds` | **Stream SSE** (`text/event-stream`) com heartbeat a cada 15s e entrega isolada por escopo de usuário/equipe. |
| `/api/shifts` | `GET`, `POST` | `ORDERS_KANBAN` / `ORDERS_HISTORY` | Consulta, abre e fecha turnos operacionais com conferência cega e trava para pedidos pendentes (`forceClose` auditado). |

---

## 4. Logística, Entregadores, Geolocalização e Cupons

| Endpoint | Métodos | Acesso | Descrição |
| :--- | :--- | :--- | :--- |
| `/api/delivery/calculate` | `POST` | Público | Calcula taxa e viabilidade de entrega por distância geodésica e raio máximo. |
| `/api/delivery/[token]` | `GET` | Público (token único) | Dados públicos de acompanhamento da corrida. |
| `/api/delivery/[token]/start` | `POST` | Token válido | Inicia rota (`ready` → `delivering`) registrando `dispatchedAt`. |
| `/api/delivery/[token]/track` | `POST` | Token válido | Atualiza telemetria GPS do entregador em trânsito. |
| `/api/delivery/[token]/complete` | `POST` | Token válido (Rate limit anti-brute-force no PIN) | Conclui entrega validando `orderPin` (ou `bypassPin` por Staff) registrando `deliveredAt`. |
| `/api/couriers`, `[id]`, `[id]/status` | `GET`, `POST`, `PUT`, `DELETE`, `PATCH` | `ORDERS_KANBAN` (projeção sem `pixKey`) / `logistics_manage` (completo) | Gestão de entregadores da escala e disponibilidade. |
| `/api/geocode/search` & `reverse` | `GET` | Público (Rate Limit) | Proxy validado para Nominatim (OpenStreetMap). |
| `/api/routes` | `GET` | Público (Rate Limit) | Cálculo de rota via OSRM com validação estrita de faixa de coordenadas. |
| `/api/coupons` & `[id]` | `GET`, `POST`, `PUT`, `DELETE` | `coupons_manage` | Gestão de cupons (percentual, fixo, `oncePerUser`, fidelidade). |
| `/api/coupons/validate` | `POST` | Público / Autenticado (Rate Limit: 10/min) | Valida elegibilidade de cupom e aplica anti-spoofing para visitantes. |

---

## 5. Comunicação, Configurações e Administração Estrita

| Endpoint | Métodos | Acesso | Descrição |
| :--- | :--- | :--- | :--- |
| `/api/store/status` | `GET` | Público | Status em tempo real (`OPERATIONAL_READY`, `CONVEYOR_PAUSED`, `STORE_CLOSED`) no fuso `America/Cuiaba`. |
| `/api/settings`, `loading`, `loyalty-badges` | `GET`, `PUT` | Público (`GET`) / `settings_manage` ou `theme_manage` ou `loyalty_manage` | Configurações da loja, splash/temas e regras de selos de fidelidade. |
| `/api/admin/conveyor/toggle` | `PATCH` | `ORDERS_KANBAN` | Liga/pausa a esteira de cozinha em tempo real. |
| `/api/notifications`, `templates`, `audience` | `GET`, `POST`, `PUT`, `DELETE`, `PATCH` | Autenticado (próprias) / `notifications_manage` (broadcast e templates) | Central de notificações, segmentação de audiência (excluindo staff) e leitura. |
| `/api/upload` & `addon-thumb` | `POST` | `menu_manage` / `theme_manage` / `settings_manage` | Upload restrito (máx. 5MB) com validação MIME e conversão para WebP (`sharp`). |
| `/api/admin/users`, `[id]`, `[id]/history` | `GET`, `POST`, `PATCH`, `DELETE` | `users_manage` (com bloqueio de escalonamento por `EDITOR`) | Gestão de clientes e equipe. |
| `/api/admin/roles` & `[id]` | `GET`, `POST`, `PATCH`, `DELETE` | `users_manage` (`GET`) / **Somente `ADMIN`** (mutações) | Criação e edição de cargos customizados RBAC. |
| `/api/admin/avatars` & `[id]` | `GET`, `POST`, `PUT`, `DELETE` | `loyalty_manage` / `theme_manage` | Gestão de presets de avatares e critérios de desbloqueio. |
| `/api/admin/audit-logs` | `GET` | **Somente `ADMIN`** (405 em mutações) | Consulta imutável de trilhas de auditoria administrativa. |
| `/api/admin/maintenance/purge-inactive` | `POST` | **Somente `ADMIN`** | Expurgo seguro de registros inativos antigos (TTL 60 dias) preservando histórico de pedidos. |
