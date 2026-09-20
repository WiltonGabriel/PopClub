# Pop Shake — Scripts de Diagnóstico, CI e Utilitários

Diretório centralizado de scripts de governança, testes e suporte operacional do projeto.

---

## 🧪 Suíte de Testes e Diagnóstico (Raiz)

### 1. `scripts/smoke-test-all.mjs` (Oficial de CI / Sanity Checks)
- **Função**: Bateria completa de testes automatizados ponta a ponta (18 verificações) avaliando os 4 pilares do sistema:
  - **Módulo A**: Autenticação (Admin, Cliente, JWT, Rejeição 401 sem falhas 500).
  - **Módulo B**: Vitrine pública (StoreSettings, LoadingSettings, Categorias, Produtos com relações, Banners, Avatares).
  - **Módulo C**: Simulação de pedido real (Criação, Itens, Totais, Transição de status na esteira e limpeza).
  - **Módulo D**: Cupons e regras de negócio (Cupons fixos e percentuais, validações de pedidos).
- **Como executar**:
  ```bash
  node scripts/smoke-test-all.mjs
  ```

### 2. `scripts/diagnose-db.mjs`
- **Função**: Diagnóstico ultrarrápido de conectividade, latência, contagem de todas as tabelas e validação de query das rotas críticas (`/api/categories`, `/api/products`, `/api/promotions`).
- **Como executar**:
  ```bash
  node scripts/diagnose-db.mjs
  ```

---

## 🛠️ Utilitários Operacionais (`scripts/utils/`)

### 1. `scripts/utils/transfer-db.mjs`
- **Função**: Extração e migração relacional completa de dados entre instâncias PostgreSQL (Local -> VPS/Produção) utilizando Prisma Client nativo, sem dependência de `pg_dump`.
- **Como executar**:
  ```bash
  REMOTE_DATABASE_URL="postgresql://user:pass@IP_VPS:5432/popclub" node scripts/utils/transfer-db.mjs
  ```

### 2. `scripts/utils/reset-admin.mjs`
- **Função**: Utilitário de segurança para reinjetar ou redefinir a senha do usuário Administrador (`admin@popclub.com`) com geração de hash bcrypt 100% validado.
- **Como executar**:
  ```bash
  node scripts/utils/reset-admin.mjs [NOVA_SENHA_OPCIONAL]
  ```
