# Estratégia de Testes Automatizados — PopClub

Este documento define a estratégia, convenções e regras inegociáveis para a criação e manutenção de testes automatizados com **Vitest** no projeto PopClub.

---

## 1. Ferramenta e Comandos Oficiais

- **Framework**: `Vitest` v5 + `@vitest/coverage-v8`
- **Execução Completa**:
  ```bash
  npm test
  ```
- **Execução com Cobertura**:
  ```bash
  npm run test:coverage
  ```
- **Execução em Modo Watch (desenvolvimento local)**:
  ```bash
  npm run test:watch
  ```

---

## 2. Tipos de Testes no PopClub

### A. Testes Unitários (`tests/unit/*.test.ts`)
- **Foco**: Funções puras de domínio, calculadoras financeiras, horários de funcionamento, regras de validação de cupons e estoque.
- **Características**:
  - Execução instantânea (milissegundos).
  - Sem I/O de rede ou banco de dados real.
  - Cobertura obrigatória para casos felizes, limites (boundary values) e exceções esperadas.

### B. Testes de Integração e Rotas (`tests/integration/*.test.ts`)
- **Foco**: Route handlers de API (`/api/...`), fluxos de autenticação, RBAC (permissões administrativas), conformidade LGPD, rate-limiting e tratamento padronizado de erros (`handleApiError`).
- **Verificações**:
  - Código de status HTTP (200, 201, 400, 401, 403, 404, 500).
  - Estrutura e formato de corpo JSON retornado.
  - Bloqueio correto de usuários sem sessão ou sem permissão necessária.
  - Comportamento de concorrência e TTL de janelas de tempo.

### C. Testes de Regressão (Obrigatórios para Bug Fixes)
- Sempre que um bug for corrigido:
  1. Escreva um teste que reproduza a falha identificada (o teste falhará antes da correção).
  2. Implemente a correção na aplicação.
  3. Execute o teste para comprovar que agora passa.
  4. Garanta que nenhum outro teste existente foi quebrado.

---

## 3. As 10 Regras de Ouro dos Testes no PopClub

1. **Toda nova regra de negócio relevante deve possuir testes automatizados.**
2. **Toda correção de bug deve incluir um teste de regressão.**
3. **Alterações em endpoints de API devem verificar respostas válidas e inválidas, códigos de status HTTP e validações Zod.**
4. **Os testes devem cobrir casos felizes, cenários de falha, limites e entradas inválidas.**
5. **Os testes devem ser determinísticos e independentes entre si** (sem depender de ordem de execução ou estado compartilhado mutável).
6. **Evite testes frágeis** que validem detalhes internos de implementação privada em vez do comportamento observável público.
7. **NUNCA altere a asserção de um teste para fazê-lo passar** quando o comportamento correto da aplicação ainda estiver errado.
8. **NUNCA remova ou comente testes existentes** apenas para contornar falhas.
9. **Não abuse de mocks** onde um teste de integração real ou uma chamada direta a funções puras de domínio for mais confiável.
10. **NUNCA declare que os testes passaram sem executá-los** no terminal e inspecionar a saída do Vitest.

---

## 4. Metas e Diretrizes de Cobertura de Código

- **Camada de Domínio (`src/domain/`)**: Meta de **>= 90%** de cobertura de linhas e branches.
- **Serviços Críticos e Handlers de Erro**: Alta cobertura em caminhos de validação, tratamento de exceções e controle de acesso RBAC.
- **Foco de Qualidade**: Não persiga métricas arbitrárias de 100% em arquivos puramente declarativos (como interfaces ou componentes simples de UI) ao custo de criar testes superficiais. Teste o que possui lógica, regras, cálculos e riscos de segurança.
