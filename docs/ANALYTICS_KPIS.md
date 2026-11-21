# Métricas, KPIs e Gráficos Operacionais — PopClub

Este documento detalha as regras de cálculo implementadas em [`AnalyticsDomainService`](../src/domain/services/AnalyticsDomainService.ts) para o painel **Métricas & Desempenho** (`/admin`).

---

## 1. Regras Base e Integridade dos Dados

- **Isolamento de Cancelados:** Pedidos com `status === "cancelled"` são **estritamente excluídos** do faturamento válido, receita de produtos, fretes, conciliação de meios de pagamento, comparação Delivery vs Balcão, Top Bairros, ranking de produtos/categorias/adicionais e performance de cupons. Pedidos cancelados alimentam exclusivamente os contadores de cancelamento, taxa de conclusão e a auditoria de perda financeira e motivos.
- **Escopo de Análise:**
  - **Turno Ativo:** Considera apenas pedidos não arquivados ou vinculados ao `currentShiftId`.
  - **Histórico Acumulado:** Permite recortes temporais (`Hoje`, `7 Dias`, `Este Mês`, `Este Ano`, `Todo o Período`) com cálculo comparativo automático (**Delta %**) contra o período imediatamente anterior (exceto em `Todo o Período` e `Turno Ativo`).

---

## 2. KPIs Executivos e Operacionais

| KPI | Fórmula / Regra | Observação Operacional |
| :--- | :--- | :--- |
| **Faturamento Válido** | `Σ total_amount` (pedidos não cancelados) | Decomposto em Receita de Produtos, Fretes e Descontos aplicados. |
| **Ticket Médio (Produtos)** | `Receita de Produtos / Pedidos Válidos` | Remove a distorção da taxa de entrega para medir consumo real no cardápio; exibe também o Ticket Total (com frete) e a média de itens por pedido. |
| **Taxa de Conclusão** | `(Entregues / Total de Pedidos) × 100` | Acompanhado de em andamento e taxa de cancelamento. |
| **SLA de Cozinha (Prep Time)** | Média de `(dispatched_at - created_at)` em minutos | Amostra limpa (`0 < Δ ≤ 240 min`); exibe `—` quando não há timestamps registrados. Meta de referência: ≤ 15 min. |
| **SLA de Rota** | Média de `(delivered_at - dispatched_at)` em minutos | Mede o tempo efetivo do entregador em trânsito. |
| **Lead Time Total & Meta SLA** | Média de `(delivered_at ou updated_at - created_at)` | Meta de referência adotada no painel: **≤ 40 min** (`slaWithinTargetRate`). |
| **Taxa de Recompra (Retenção)** | `(Clientes com ≥ 2 pedidos válidos / Clientes únicos) × 100` | Inclui participação na receita (`repeatRevenueShare`) dos clientes recorrentes. |
| **Upsell de Adicionais** | `Σ (addon.price × addon.quantity × item.quantity)` | Acompanhado do **Attach Rate** (% de itens do carrinho que incluem adicionais). |

---

## 3. Gráficos e Visões Disponíveis

1. **Evolução de Faturamento & Pedidos Válidos (`ComposedChart`):** Combina área de faturamento (`R$`) com linha de volume de pedidos válidos (`un.`), com granularidade hora a hora (`Hoje`/`Turno Ativo`), diária (`7 Dias`/`Este Mês`) ou mensal (`Este Ano`/`Todo o Período`).
2. **Demanda por Horário (Picos):** Distribuição hora a hora destacando automaticamente o(s) horário(s) de pico para dimensionamento de equipe de cozinha e entregadores.
3. **Desempenho por Dia da Semana (`Dom–Sáb`):** Identifica sazonalidade semanal e o dia de maior faturamento.
4. **Mix de Receita por Categoria & Ranking de Produtos:** Alternância entre **Top** e **Menor Giro** (incluindo itens do catálogo com 0 vendas) e alternância por **Volume (Qtd)** ou **Faturamento (R$)**, além do modal completo de giro.
5. **Adicionais Mais Pedidos & Impacto de Cupons:** Ranking dos adicionais de maior saída/receita, comparativo `Ticket c/ Cupom` vs `Ticket s/ Cupom` e ranking de códigos promocionais.
6. **Conciliação de Meios de Pagamento:** Alternância entre **Receita (R$)** e **Pedidos (un.)** para PIX, Cartão e Dinheiro.
7. **Delivery vs Balcão, Top Bairros & Entregadores:** Ticket limpo por canal, concentração geográfica de entregas/fretes e produtividade individual por entregador (corridas, tempo médio de rota e ocorrências).
8. **Qualidade Operacional:** Funil de conclusão, perda por cancelamento (`R$`), motivos recorrentes (`cancellation_reason`) e ocorrências de rota (`delivery_issue`).
