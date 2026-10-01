# CENTRO UNIVERSITÁRIO DE VÁRZEA GRANDE — UNIVAG
## CURSO DE TECNOLOGIA EM ANÁLISE E DESENVOLVIMENTO DE SISTEMAS
### PROJETO EXTENSIONISTA INTEGRADOR (2026/2)
### DESENVOLVIMENTO DE PROGRESSIVE WEB APPS (PWAs) COM FRAMEWORKS AVANÇADOS

---

# RELATÓRIO DE EVIDÊNCIAS DE CAMPO E VALIDAÇÃO COM CLIENTE PARCEIRO
## Documento Comprobatório de Atividades Práticas — Tarefa 2 (Relatório Periódico 1 - RP1)

---

**Equipe de Desenvolvimento (Equipe ADP):**
- **Wilton Gabriel Albuquerque Pereira** — Arquiteto de Software & Mantenedor Principal
- **Adriel Felipe** — Analista de Documentação
- **João Lucas** — Analista de Qualidade & Relacionamento

**Entidade Parceira / Beneficiária:** Pop Shake Sorveteria & Açaí Artesanal  
**Responsável no Estabelecimento:** Gerência Operacional e de Atendimento  
**Localização:** Várzea Grande – MT  
**Período de Execução:** Agosto a Setembro de 2026  

---

## 1. INTRODUÇÃO E OBJETIVO DO ARTEFATO DE EVIDÊNCIAS

Este documento formaliza as evidências empíricas coletadas pela Equipe ADP durante as etapas de imersão operacional, levantamento presencial de requisitos, testes de usabilidade e validação técnica da plataforma **PopClub** junto à empresa parceira **Pop Shake Sorveteria & Açaí Artesanal**.

A atividade extensionista conectou o desenvolvimento de software às demandas econômicas e logísticas do comércio varejista de Várzea Grande – MT, registrando o alinhamento de expectativas entre a equipe acadêmica, a gerência do estabelecimento, os operadores de balcão e os entregadores parceiros.

---

## 2. ATA DE REUNIÃO E ALINHAMENTO TÉCNICO PRESENCIAL

**Tabela 1 – Identificação da Reunião de Alinhamento e Homologação Técnica**

| Item | Descrição / Dados do Registro |
| :--- | :--- |
| **Data e Horário** | 18 de Setembro de 2026, das 14h00 às 17h30 (Duração: 3 horas e 30 minutos) |
| **Local** | Estabelecimento Comercial Pop Shake Sorveteria & Açaí Artesanal — Várzea Grande – MT |
| **Participantes Presentes** | **Wilton Gabriel Albuquerque Pereira** (Arquiteto de Software & Mantenedor Principal)<br>**Adriel Felipe** (Analista de Documentação)<br>**João Lucas** (Analista de Qualidade & Relacionamento)<br>**Gerência de Operações da Pop Shake** (Representante Comercial da Entidade Parceira)<br>**Operador de Balcão e Caixa** (Usuário-chave do Painel Operacional)<br>**Responsável de Cozinha / Montagem** (Usuário-chave da Esteira de Produção) |
| **Pauta Principal** | 1. Diagnóstico dos custos de comissão cobrados por marketplaces intermediários.<br>2. Demonstração prática da vitrine PWA mobile e fluxo de *Fast Access*.<br>3. Teste do painel Kanban de cozinha com alertas sonoros de pedidos.<br>4. Simulação de despacho de corridas diretamente no WhatsApp do entregador.<br>5. Fechamento de turno de trabalho com conciliação financeira de caixa. |

*Fonte: Elaborado pelos autores (2026).*

### Síntese das Demonstrações e Deliberações da Reunião
1. **Vitrine PWA no Smartphone:** Demonstração da navegação responsiva em aparelho móvel, testando a instalação na tela inicial sem download em lojas de aplicativos. Tempo de carregamento sub-segundo e catálogo com fotos WebP validados com louvor.
2. **Esteira Kanban e Alerta Sonoro:** Posicionamento de tablet na bancada de montagem. Ao submeter um pedido de teste no celular, o sino de cozinha tocou instantaneamente, e o pedido foi para a barra de triagem. A equipe comprovou que a visualização rápida dos adicionais evita erros de produção.
3. **Simulação de Despacho com Motoboy:** O atendente selecionou o entregador da escala, digitou a palavra de confirmação **"CONFIRMO"** e o sistema abriu o WhatsApp com rota traçada no Google Maps, valor a cobrar, troco discriminado e link de telemetria GPS.
4. **Fechamento e Auditoria de Turno:** O gestor acompanhou o encerramento do expediente com segregação exata de valores em Dinheiro (com controle de trocos), Cartão na Maquininha e Pix na Entrega.

---

## 3. REGISTRO DE VALIDAÇÃO E FEEDBACK DA ENTIDADE PARCEIRA

### 3.1. Aspectos Elogiados pela Equipe Operacional
- **Eliminação de Comissões de 12% a 27%:** Manutenção de 100% da margem líquida para o estabelecimento através do canal de vendas direto.
- **Velocidade de Compra no Fast Access:** Ausência de senhas compulsórias na primeira compra, reduzindo atritos e tempo de decisão do consumidor.
- **Despacho Direto via WhatsApp:** Dispensa o uso de aplicativos pesados para os motoboys, entregando o link de rota do Google Maps pronto para navegação.
- **Sino de Cozinha Intermitente:** O alarme periódico a cada 10 segundos garante que nenhum pedido fique esquecido durante momentos de pico na loja física.

### 3.2. Pontos de Atrito Detectados e Ajustes Implementados

**Tabela 2 – Matriz de Feedbacks Coletados e Melhorias Técnicas Implementadas**

| Apontamento do Cliente Parceiro | Impacto Operacional | Solução Técnica Desenvolvida e Incorporada |
| :--- | :--- | :--- |
| *"Às vezes o morango ou o leite Ninho acaba no meio da noite e não podemos perder tempo editando o cardápio."* | Risco de vender insumos esgotados na vitrine. | Criado o interruptor (*toggle switch*) instantâneo **"Pausar na Cozinha"** no módulo de complementos e estoque. Oculta o item da vitrine em tempo real sem apagar dados nem quebrar pedidos passados. |
| *"Temos medo do operador esbarrar a mão na tela touch do tablet e despachar o pedido sem querer."* | Despacho prematuro antes do açaí estar montado e pronto. | Implementada trava de segurança com confirmação digitada manual: o botão de despacho só é liberado após o operador digitar expressamente a palavra **"CONFIRMO"**. |
| *"No final do turno, não podemos fechar o caixa se algum motoboy ainda estiver na rua com dinheiro para acertar."* | Risco de furos na conciliação contábil diária. | Implementado **bloqueio terminante de fechamento** na rota `/api/shifts`: a API rejeita o fechamento com o erro `PENDING_ORDERS_ACTIVE` caso haja qualquer pedido ativo na esteira, listando as pendências. |
| *"O cliente às vezes pede troco para R$ 50,00 e o motoboy não sabe quanto precisa levar de moeda."* | Atrito na porta do cliente e atraso nas entregas. | Adicionado campo de troco com recálculo automático no checkout e exibição destacada tanto na comanda térmica quanto no template do WhatsApp: *"Troco para: R$ 50,00 • Devolver: R$ 18,00"*. |

*Fonte: Elaborado pelos autores (2026).*

---

## 4. QUADRO CRONOLÓGICO DE ATIVIDADES PRÁTICAS E IMERSÃO DE CAMPO

O plano de trabalho extensionista foi cumprido mediante a realização das atividades práticas descritas no cronograma abaixo, totalizando a carga horária de imersão técnica e validação de requisitos:

**Tabela 3 – Cronograma e Mapeamento de Carga Horária das Atividades de Extensão**

| Data | Horas | Atividade Prática Executada | Local | Integrantes Envolvidos |
| :---: | :---: | :--- | :--- | :--- |
| **12/08/2026** | 4h | Visita técnica inicial, apresentação da proposta extensionista à gerência e diagnóstico das dores com taxas de aplicativos terceiros. | Sede da Pop Shake | Equipe ADP e Gerência |
| **19/08/2026** | 6h | Imersão operacional na esteira de cozinha para mapeamento da curva térmica do açaí, tempos de montagem e fluxo de comandas. | Cozinha / Balcão | Equipe ADP e Montadores |
| **26/08/2026** | 6h | Coleta e especificação dos requisitos funcionais (32 RFs) e não-funcionais (16 RNFs), modelagem relacional de entidades no Prisma Schema. | Laboratório UNIVAG | Wilton Gabriel e Adriel Felipe |
| **04/09/2026** | 8h | Desenvolvimento da vitrine PWA mobile com componentes touch-first e rotinas anti-tampering no cálculo de preços do checkout. | Laboratório UNIVAG | Wilton Gabriel |
| **11/09/2026** | 6h | Implementação do painel Kanban de pedidos, testes do sintetizador sonoro de sino de cozinha e rotinas de impressão térmica de 80mm. | Laboratório UNIVAG | Wilton Gabriel e João Lucas |
| **18/09/2026** | 6h | Sessão presencial de testes com a gerência, validação do despacho via WhatsApp com motoboys e homologação do fechamento de turnos. | Balcão da Pop Shake | Equipe ADP, Equipe da Loja e Motoboy |
| **25/09/2026** | 4h | Implementação dos ajustes solicitados (Pausa na Cozinha, trava "CONFIRMO" e bloqueio de turnos) e compilação do relatório formal RP1. | Laboratório UNIVAG | Equipe ADP |
| **Total** | **40h** | **Totalização da Carga Horária Prática Extensionista Cumprida** | — | — |

*Fonte: Elaborado pelos autores (2026).*

---

## 5. ROTEIRO DE DEMONSTRAÇÃO E HOMOLOGAÇÃO DAS TELAS

Durante as reuniões práticas presenciais, foram homologados com sucesso os seguintes fluxos e telas do sistema:

1. **Vitrine do Consumidor PWA (`/` e `/carrinho`):**
   - Navegação por categorias com imagens WebP e selos promocionais.
   - Modal dinâmico de montagem de açaí com contadores numéricos para acompanhamentos.
   - Cálculo automático de adicionais inclusos gratuitamente e itens cobrados à parte.
   - Checkout com seleção de endereço georreferenciado (OpenStreetMap / Nominatim) e frete dinâmico.
   - Modalidades de pagamento: Dinheiro com cálculo de troco, Cartão na Maquininha e Pix na Entrega.
2. **Central Operacional de Balcão e Cozinha (`/admin/pedidos`):**
   - Barra superior de triagem com sino sonoro intermitente a cada 10s.
   - Quadro Kanban: colunas Fila, Em Preparo, Pronto e Em Rota.
   - Impressão térmica monoespaçada de comprovante de produção (80mm).
   - Modal de despacho com confirmação digitada manual e acionador de mensagem no WhatsApp.
3. **Gestão de Turnos e Estoque (`/admin/historico` e `/admin`):**
   - Abertura de turno com código cronológico (`TURNO-YYYY-MM-DD-XXXX`).
   - Switch operacional "Pausar na Cozinha" com desativação em tempo real na vitrine.
   - Bloqueio de fechamento de turno em caso de pedidos pendentes na esteira.
   - Relatório financeiro executivo com conciliação exata de dinheiro, Pix e cartões.

---

## 6. DECLARAÇÃO DE CONCORDÂNCIA E HOMOLOGAÇÃO

A gerência da **Pop Shake Sorveteria & Açaí Artesanal** declara para os devidos fins acadêmicos junto ao **Centro Universitário de Várzea Grande (UNIVAG)** que participou ativamente das etapas de alinhamento, testes e validação da plataforma **PopClub**, atestando que a solução atende com excelência às necessidades operacionais e estratégicas da empresa, encontrando-se pronta para prosseguimento para as etapas finais de homologação e implantação no segundo período letivo (RP2).

<br>

__________________________________________________  
**Pop Shake Sorveteria & Açaí Artesanal**  
Representante Operacional / Comercial

<br>

__________________________________________________  
**Wilton Gabriel Albuquerque Pereira**  
Arquiteto de Software & Mantenedor Principal — Equipe ADP

__________________________________________________  
**Adriel Felipe**  
Analista de Documentação — Equipe ADP

__________________________________________________  
**João Lucas**  
Analista de Qualidade & Relacionamento — Equipe ADP
