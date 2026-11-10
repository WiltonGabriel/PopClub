# Regra de Projeto: Diretrizes Obrigatórias de Engenharia de Software

Esta regra possui aplicação contínua e incondicional em todas as atividades de desenvolvimento, modificação, depuração e refatoração no projeto **PopClub**.

---

## 1. Obrigatoriedade da Skill `mandatory-clean-code-solid`

Sempre que executar qualquer uma das seguintes tarefas:
- Criação de novas funcionalidades ou módulos.
- Correção de bugs ou tratamento de exceções.
- Refatoração de código legado ou existente.
- Criação ou modificação de rotas e controladores HTTP (`src/app/api/...`).
- Modificação de entidades, serviços de aplicação (`src/services/...`), domínio (`src/domain/...`) ou infraestrutura (`src/lib/...`).
- Alterações no banco de dados (`prisma/schema.prisma` ou migrações).
- Criação e manutenção de testes automatizados (`tests/...`).
- Revisão de código e decisões arquiteturais.

O assistente de IA deve obrigatoriamente ler e aplicar as diretrizes contidas na skill:
[mandatory-clean-code-solid](../skills/mandatory-clean-code-solid/SKILL.md)

---

## 2. Princípios Inegociáveis

1. **SOLID Proporcional**:
   - **SRP Absoluto**: Rotas de API não realizam cálculos de negócio nem persistência SQL direta; serviços orquestram; domínio calcula puramente; infraestrutura persiste.
   - OCP, LSP, ISP e DIP aplicados onde geram desacoplamento real, sem over-engineering.

2. **Clean Code**:
   - Sem abreviações crípticas, sem variáveis genéricas (`data`, `obj`, `res2`).
   - Métodos pequenos (<= 25-30 linhas), coesos e autoexplicativos.
   - Constantes semânticas no lugar de valores mágicos.
   - Erros tratados explicitamente com `DomainException` e `handleApiError`.
   - Remoção de código morto e eliminação de duplicações nocivas.

3. **Testes Automatizados Obrigatórios (Vitest)**:
   - Toda nova regra de negócio possui testes unitários (`tests/unit/`).
   - Todo bug corrigido inclui um teste de regressão que reproduz a falha.
   - Alterações em APIs testam casos de sucesso, falha e validação (`tests/integration/`).
   - NUNCA declarar conclusão sem executar `npm test` e verificar o resultado.

4. **Segurança e Integridade**:
   - Validação de payload via Zod.
   - Autenticação e RBAC em rotas administrativas.
   - Transações atômicas via `prisma.$transaction`.
   - Mensagens de erro 500 sanitizadas sem expor stack traces ou credenciais de banco.

---

## 3. Checklist Obrigatório Pré-Conclusão

Antes de concluir qualquer tarefa, avalie rigorosamente o checklist de 12 pontos em:
[checklist.md](../skills/mandatory-clean-code-solid/references/checklist.md)
