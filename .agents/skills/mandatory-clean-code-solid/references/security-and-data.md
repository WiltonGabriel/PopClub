# Segurança Defensiva e Integridade dos Dados — PopClub

Este documento descreve as práticas obrigatórias de segurança da informação, proteção de dados e integridade transacional no PopClub.

---

## 1. Validação e Sanitização de Entradas (Zod)

- Nenhuma rota de API deve confiar em payloads recebidos do cliente.
- Use schemas Zod estritos para tipar e validar:
  - `req.json()` (corpo da requisição)
  - `req.nextUrl.searchParams` (filtros e paginação)
  - Parâmetros dinâmicos de rota (`params: Promise<{ id: string }>`)
- Sanitizar strings contra injeção de HTML/scripts (XSS) ao lidar com campos de texto livre (observações de pedidos, avaliações, descrições).

---

## 2. Autenticação, Sessão e RBAC (Role-Based Access Control)

- **Rotas Administrativas (`/api/admin/...`)**:
  - Exigem sessão ativa e validação explícita de permissão através de `hasPermission(userRole, requiredPermission)`.
  - Se o usuário não estiver autenticado -> retornar **401 Unauthorized**.
  - Se o usuário estiver autenticado mas sem permissão suficiente -> retornar **403 Forbidden**.
- **Segurança de Cookies e Tokens**:
  - Tokens JWT devem trafegar em cookies `httpOnly`, `secure` (em produção) e `sameSite: 'lax'`.
  - Senhas de usuários sempre armazenadas com hash forte (`bcryptjs` com salt rounds adequados).

---

## 3. Prevenção de Vazamento de Dados Sensíveis

- **Tratamento de Erros Seguro**:
  - Toda rota deve utilizar `handleApiError(error, context)`.
  - Erros 500 (`Internal Server Error`) NUNCA devem enviar mensagens brutas do banco de dados (ex: `"password leaked"`, `"violates foreign key constraint"`, `"syntax error at or near..."`).
  - O cliente recebe apenas uma mensagem amigável e segura, enquanto o log interno registra o erro completo para os desenvolvedores.
- **DTOs de Saída**:
  - Nunca retorne o modelo de usuário do Prisma inteiro para o cliente. Filtre campos como `passwordHash`, `twoFactorSecret`, tokens de redefinição de senha e metadados internos de auditoria.

---

## 4. Integridade Transacional no Banco de Dados

- Para qualquer operação que envolva mais de uma mutação no banco de dados, utilize transações:
  ```typescript
  await prisma.$transaction(async (tx) => {
    // 1. Decrementar estoque
    // 2. Registrar pedido
    // 3. Associar cupom de desconto
    // 4. Gravar log de auditoria
  });
  ```
- Isso garante atomicidade: se qualquer passo falhar, todas as alterações são revertidas, impedindo inconsistências e pedidos órfãos.

---

## 5. Conformidade com a LGPD e Privacidade

- Respeitar os direitos dos titulares de dados:
  - Consulta de dados pessoais (`GET /api/users/privacy`).
  - Anonimização e exclusão de contas mediante requisição legítima (`DELETE /api/users/privacy`).
  - Mascaramento de dados em relatórios ou logs compartilhados (ex.: mascarar CPF, telefone e e-mail).
