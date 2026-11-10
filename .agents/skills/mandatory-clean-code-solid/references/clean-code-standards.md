# Padrões de Clean Code — PopClub

Este documento sintetiza os padrões de legibilidade, clareza, manutenção e simplicidade adotados no código do projeto PopClub.

---

## 1. Nomenclatura Intencional e Consistente

- **Variáveis e Propriedades**: Devem responder "o que representa?".
  - `isStoreOpen` (booleano)
  - `pendingOrdersCount` (número)
  - `customerPhoneNumber` (string)
  - ❌ Evitar: `flag`, `data2`, `temp`, `res`, `c`, `arr`.
- **Funções**: Verbo + Substantivo denotando a ação exata.
  - `calculateOrderTotal`
  - `validateUserPermission`
  - `syncInventoryLevels`
  - ❌ Evitar: `process()`, `handle()`, `doThings()`, `checkData()`.
- **Constantes**: `UPPER_SNAKE_CASE` para valores fixos e de configuração.
  - `MAX_FAILED_LOGIN_ATTEMPTS = 5;`
  - `JWT_EXPIRATION_IN_HOURS = 24;`

---

## 2. Funções Pequenas e com Nível Único de Abstração

- **Tamanho**: Priorize funções com menos de 25 a 30 linhas.
- **Faça uma Coisa**: Se uma função calcula o preço, formata o recibo e grava no banco, ela deve ser dividida em 3 funções coordenadas por um método mestre.
- **Evite Parâmetros Excessivos**: Mais de 3 parâmetros deve ser agrupado em um objeto/DTO tipado.
  - ❌ `function createOrder(userId, address, zip, phone, coupon, deliveryMethod, notes)`
  - ✅ `function createOrder(params: CreateOrderInput)`

---

## 3. Eliminação de Valores Mágicos

Nunca deixe literais "mágicos" soltos pelo código:
```typescript
// ❌ RUIM: O que significam 15, 30 e 0.1?
if (order.total > 15 && user.loyaltyPoints > 30) {
  discount = order.total * 0.1;
}

// ✅ BOM: Autoexplicativo e fácil de alterar
const MIN_ORDER_VALUE_FOR_LOYALTY_DISCOUNT = 15;
const MIN_LOYALTY_POINTS_REQUIRED = 30;
const LOYALTY_DISCOUNT_PERCENTAGE = 0.10;

if (order.total > MIN_ORDER_VALUE_FOR_LOYALTY_DISCOUNT && user.loyaltyPoints > MIN_LOYALTY_POINTS_REQUIRED) {
  discount = order.total * LOYALTY_DISCOUNT_PERCENTAGE;
}
```

---

## 4. Tratamento Explícito de Erros e Tipagem Estrita

- **Sem `any` indiscriminado**: Utilize tipos explícitos, `unknown` com validação de runtime (via Zod) ou tipos genéricos.
- **Exceções de Domínio**:
  - Lance exceções com código e semântica definida em `src/domain/errors/`:
    - `ResourceNotFoundException("Produto", id)`
    - `OutOfStockException(productName, available, requested)`
    - `ForbiddenActionException(requiredPermission)`
    - `InvalidStateTransitionException(currentStatus, nextStatus)`
- **Uso de `handleApiError`**:
  - Todas as rotas de API em `src/app/api/**/route.ts` devem capturar erros no bloco `catch` e passar por `handleApiError(error, context)`.
  - Isso garante status HTTP corretos (400, 401, 403, 404, 500) e sanitização contra vazamento de stack traces ou senhas de banco.

---

## 5. Eliminação de Código Morto e Duplicação (DRY com Bom Senso)

- Remova console.logs de depuração temporária (use `logger.info`, `logger.warn`, `logger.error` de `src/lib/logger.ts`).
- Remova imports não utilizados e funções comentadas.
- Aplique DRY (Don't Repeat Yourself) para regras de negócio e cálculos, mas não force DRY em códigos que apenas se parecem acidentalmente, evitando acoplamento desnecessário.

---

## 6. Comentários: Explique o "Porquê", Não o "O Quê"

- O código limpo deve expressar claramente **o que** ele está fazendo através da escolha de nomes e estrutura.
- Comentários são reservados para:
  - Explicar restrições da LGPD ou regras fiscais/bancárias peculiares.
  - Justificar decisões de design não óbvias ou contornos temporários documentados.
  - Avisos de concorrência ou operações atômicas sensíveis.
