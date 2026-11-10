# Checklist Obrigatório Pré-Conclusão de Tarefas — PopClub

> [!IMPORTANT]
> **Checklist Inegociável**: Antes de declarar qualquer tarefa concluída, responda rigorosamente às 12 perguntas abaixo. Se alguma resposta indicar um problema, corrija-o imediatamente antes de finalizar.

---

### 1. Princípio da Responsabilidade Única (SRP) e SOLID
- [ ] **A mudança respeita o SRP e os demais princípios SOLID aplicáveis?**
  - O código não acumulou múltiplas responsabilidades (ex: rota HTTP com cálculo ou query Prisma embutida).
  - Componentes novos ou alterados possuem um único motivo para mudar.

### 2. Clean Code e Legibilidade
- [ ] **O código está legível e segue os padrões de Clean Code?**
  - Nomes de funções, variáveis e constantes revelam intenção sem abreviações crípticas.
  - Funções são curtas e coesas.
  - Valores numéricos ou literais foram substituídos por constantes semânticas.
  - Não há código morto, imports não utilizados ou trechos comentados.

### 3. Camadas e Limites Arquiteturais
- [ ] **Cada responsabilidade está na camada apropriada?**
  - Rotas HTTP (`app/api`) tratam apenas requisição/resposta e validação de schema.
  - Casos de uso e orquestrações residem em `services/`.
  - Cálculos puros e regras de negócio residem em `domain/`.
  - Persistência e integrações técnicas residem em `lib/`.

### 4. Simplicidade e Proporcionalidade
- [ ] **Existem abstrações ou dependências desnecessárias?**
  - Não foram criadas camadas, interfaces ou padrões prematuros sem necessidade comprovada.
  - A solução adotada é a mais simples e direta que resolve o problema com robustez.

### 5. Cobertura de Testes Automatizados
- [ ] **Os testes cobrem os comportamentos novos ou modificados?**
  - Regras de negócio possuem testes unitários correspondentes em `tests/unit/`.
  - Endpoints ou fluxos integrados possuem testes em `tests/integration/`.

### 6. Casos Extremos, Limites e Falhas
- [ ] **Foram considerados casos de falha, limites e entradas inválidas?**
  - Entradas nulas, vazias, limites numéricos (valores negativos ou zero) foram testados.
  - Comportamentos em caso de falha de serviço ou item esgotado foram previstos.

### 7. Prevenção de Regressão em Bugs
- [ ] **Os bugs corrigidos possuem testes de regressão quando viável?**
  - Um teste específico que reproduzia a falha foi adicionado para assegurar que o bug não reapareça.

### 8. Execução e Validação das Ferramentas
- [ ] **A compilação, os testes e as verificações pertinentes foram executados?**
  - `npm test` executado e 100% aprovado.
  - `npm run build` executado e aprovado sem erros de tipagem TypeScript.
  - `npm run lint` inspecionado sem introduzir novos erros impeditivos.

### 9. Segurança e Integridade dos Dados
- [ ] **Existem riscos de segurança ou de integridade dos dados?**
  - Payloads de entrada são validados com Zod.
  - Rotas sensíveis possuem validação de autenticação e RBAC.
  - Mutação em múltiplas tabelas utiliza `prisma.$transaction`.
  - Erros 500 não vazam credenciais ou stack traces (`handleApiError`).

### 10. Compatibilidade e Não-Regressão
- [ ] **A alteração pode quebrar funcionalidades existentes?**
  - Contratos de API e DTOs mantêm retrocompatibilidade.
  - Nenhum teste legado foi adulterado ou removido para mascarar falhas.

### 11. Documentação e Tipagem
- [ ] **A documentação e as tipagens precisam ser atualizadas?**
  - Types e interfaces refletem o estado atual da aplicação.
  - Decisões de negócio não óbvias foram explicadas com comentários de contexto.

### 12. Convenções do Projeto
- [ ] **O resultado respeita as convenções existentes do projeto?**
  - Padrões de formatação, casing e estrutura de diretórios do PopClub foram mantidos.
