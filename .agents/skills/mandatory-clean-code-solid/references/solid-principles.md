# Diretrizes SOLID Proporcionais — PopClub

Este documento detalha a aplicação prática dos 5 princípios SOLID no contexto de uma aplicação Next.js 16 + TypeScript + Prisma.

---

## 1. Single Responsibility Principle (SRP)

> *"Uma classe ou módulo deve ter um, e apenas um, motivo para mudar."*

### Má Prática (Violação de SRP no Route Handler)
```typescript
// ❌ RUIM: Rota cuidando de HTTP, validação manual, SQL direto, regra de frete e envio de e-mail
export async function POST(req: Request) {
  const body = await req.json();
  if (!body.address || !body.items) return Response.json({ error: "Inválido" }, { status: 400 });
  
  // Cálculo de frete dentro da rota HTTP
  let shippingCost = 10;
  if (body.distanceKm > 5) shippingCost += (body.distanceKm - 5) * 2;
  
  // Persistência direta sem camada de serviço ou transação
  const order = await prisma.order.create({
    data: { ...body, shippingFee: shippingCost }
  });
  
  // Envio direto de notificação
  await fetch("https://api.whatsapp.com/send", { ... });
  
  return Response.json(order);
}
```

### Boa Prática (Aderente ao SRP)
```typescript
// ✅ BOM: Separação limpa de responsabilidades

// 1. src/app/api/checkout/route.ts (Apenas HTTP e orquestração de alto nível)
export async function POST(req: Request) {
  try {
    const input = checkoutSchema.parse(await req.json());
    const session = await getAuthenticatedUser(req);
    const order = await checkoutService.processOrder(session.userId, input);
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return handleApiError(error, "POST /api/checkout");
  }
}

// 2. src/domain/services/shippingCalculator.ts (Cálculo puro de negócio)
export function calculateDeliveryFee(distanceKm: number): number {
  if (distanceKm <= BASE_DISTANCE_KM) return BASE_SHIPPING_FEE;
  return BASE_SHIPPING_FEE + (distanceKm - BASE_DISTANCE_KM) * EXTRA_KM_RATE;
}

// 3. src/services/checkoutService.ts (Orquestração do caso de uso)
export class CheckoutService {
  async processOrder(userId: string, input: CheckoutInput): Promise<OrderDto> {
    const fee = calculateDeliveryFee(input.distanceKm);
    return await prisma.$transaction(async (tx) => {
      // Criação transacional segura
    });
  }
}
```

---

## 2. Open/Closed Principle (OCP)

> *"Entidades de software devem estar abertas para extensão, mas fechadas para modificação."*

### Aplicação no PopClub:
- Quando existirem diferentes regras de desconto (ex.: cupom percentual, cupom de frete grátis, desconto por primeira compra), evite blocos gigantescos de `if/else` espalhados.
- Centralize a estratégia de cálculo através de funções puras ou calculadoras modulares especializadas:
  - `calculatePercentageDiscount(cartTotal, percentage)`
  - `calculateFixedDiscount(cartTotal, fixedAmount)`
  - `calculateFreeShippingDiscount(shippingFee)`
- Para adicionar um novo tipo de promoção no futuro, basta registrar uma nova função calculadora sem alterar o fluxo principal de checkout estável.

---

## 3. Liskov Substitution Principle (LSP)

> *"Subtipos devem ser substituíveis pelos seus tipos base sem alterar o comportamento correto do programa."*

### Aplicação no PopClub:
- Se uma interface `NotificationChannel` define `send(message: string): Promise<boolean>`, qualquer implementação (`WhatsAppChannel`, `PwaPushChannel`, `EmailChannel`) deve honrar essa assinatura.
- Uma implementação não deve lançar exceções não tratadas onde outras retornam `false`, nem alterar os efeitos colaterais esperados pelo chamador.

---

## 4. Interface Segregation Principle (ISP)

> *"Clientes não devem ser forçados a depender de interfaces que não utilizam."*

### Aplicação no PopClub:
- Não crie interfaces monolíticas do tipo `interface CompleteUserProfile` com 40 campos para componentes que precisam apenas de `{ id: string; name: string; avatarUrl?: string }`.
- Crie tipos específicos e utilitários:
  - `UserSummaryDto` para listagens e cabeçalhos.
  - `UserSecuritySettingsDto` para gerenciamento de credenciais e 2FA.
  - `UserPrivacyConsentDto` para auditoria LGPD.

---

## 5. Dependency Inversion Principle (DIP)

> *"Módulos de alto nível não devem depender de módulos de baixo nível. Ambos devem depender de abstrações."*

### Aplicação no PopClub:
- Módulos de domínio (`src/domain/`) nunca devem importar diretamente `prisma`, `next/server` ou bibliotecas de terceiros como `stripe` ou `leaflet`.
- Se o domínio precisa de dados, ele recebe estruturas de dados puras (Value Objects ou DTOs) ou callbacks/interfaces abstratas fornecidas pela camada de aplicação/serviço.
- Isso permite testar o domínio com rapidez milimétrica e 100% de previsibilidade via testes unitários isolados em `tests/unit/`.
