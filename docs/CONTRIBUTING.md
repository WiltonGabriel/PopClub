# Guia de Contribuição — PopClub

Agradecemos o interesse em contribuir para o **PopClub**. Este projeto segue padrões estritos de arquitetura em camadas, testes automatizados e licenciamento aberto sob **GNU AGPL-3.0**.

---

## 1. Fluxo de Trabalho

1. Faça um *fork* do repositório e crie uma branch descritiva a partir da `main`:
   ```bash
   git checkout -b feat/nome-da-sua-feature
   ```
2. Configure o ambiente local conforme descrito no [README.md](../README.md):
   ```bash
   npm install
   docker compose -f docker-compose.dev.yml up -d
   cp .env.example .env
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   ```
3. Implemente suas alterações respeitando a arquitetura do projeto.
4. Rode o Quality Gate completo antes de abrir o Pull Request.

---

## 2. Arquitetura e Padrões de Código

O código é organizado por responsabilidades:

- **`src/app/api/**/route.ts`**: Apenas validação de entrada (Zod), verificação de sessão/RBAC, delegação e tratamento uniforme via `handleApiError`. Não coloque regras matemáticas de negócio ou queries complexas diretamente nas rotas.
- **`src/services/**`**: Orquestração de casos de uso, transações Prisma, auditoria (`recordAdminAudit`) e integrações externas.
- **`src/domain/**`**: Regras puras de domínio (cálculos financeiros, estoque, cupons, horários, analytics) e exceções tipadas derivadas de `DomainException`.
- **`src/lib/**`**: Infraestrutura compartilhada (`prisma.ts`, `auth.ts`, `permissions.ts`, `rateLimit.ts`, `sanitize.ts`).

Consulte também [docs/ARCHITECTURE.md](ARCHITECTURE.md) e [docs/SECURITY.md](SECURITY.md).

---

## 3. Testes e Quality Gate Obrigatório

Toda nova funcionalidade ou correção de bug deve vir acompanhada de testes automatizados em **Vitest**:

- **Testes Unitários (`tests/unit/*.test.ts`):** Regras puras de domínio e serviços sem dependência de rede ou banco.
- **Testes de Integração (`tests/integration/*.test.ts`):** Contratos de API, RBAC, IDOR, rate limiting e regressões.

Antes de enviar seu Pull Request, garanta que todos os comandos abaixo terminem com **Exit Code 0**:

```bash
npx prisma generate
npm test
npm run lint
npm run build
```

---

## 4. Convenções de Commit

Utilize mensagens semânticas concisas em português ou inglês:
- `feat(escopo): descrição da nova funcionalidade`
- `fix(escopo): descrição da correção de bug`
- `docs(escopo): atualização de documentação`
- `refactor(escopo): refatoração sem alteração de comportamento`
- `test(escopo): adição ou melhoria de testes`

---

## 5. Licença das Contribuições

Ao enviar um Pull Request para este repositório, você concorda que suas contribuições sejam licenciadas sob os mesmos termos da **GNU Affero General Public License v3.0 (AGPL-3.0)** descritos em [LICENSE](../LICENSE).
