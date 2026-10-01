# CENTRO UNIVERSITÁRIO DE VÁRZEA GRANDE — UNIVAG
## CURSO DE TECNOLOGIA EM ANÁLISE E DESENVOLVIMENTO DE SISTEMAS
### PROJETO EXTENSIONISTA INTEGRADOR (2026/2)
### DESENVOLVIMENTO DE PROGRESSIVE WEB APPS (PWAs) COM FRAMEWORKS AVANÇADOS

<br><br>

# RELATÓRIO DE EVIDÊNCIAS DE CAMPO E VALIDAÇÃO COM CLIENTE PARCEIRO
## Documento Comprobatório de Atividades Práticas — Tarefa 2 (Relatório Periódico 1 - RP1)

<br><br>

**Acadêmico Responsável:** Wilton Gabriel Albuquerque Pereira  
**Entidade Parceira / Beneficiária:** Pop Shake Sorveteria & Açaí Artesanal  
**Responsável no Estabelecimento:** Gerência Operacional e de Atendimento  
**Localização da Atividade:** Várzea Grande – MT  
**Período de Execução das Atividades:** Agosto a Setembro de 2026  

---

## 1. INTRODUÇÃO E OBJETIVO DO ARTEFATO DE EVIDÊNCIAS

Este documento formaliza as evidências empíricas de campo coletadas durante as etapas de imersão operacional, elicitação presencial de requisitos, testes de usabilidade e homologação técnica da plataforma **PopClub** junto à empresa parceira **Pop Shake Sorveteria & Açaí Artesanal**.

A atividade extensionista cumpriu o objetivo pedagógico de conectar o desenvolvimento de software às demandas econômicas e logísticas reais do comércio local de Várzea Grande – MT, registrando o alinhamento de expectativas entre os acadêmicos desenvolvedores, a gerência do estabelecimento, os operadores de balcão e os entregadores parceiros.

---

## 2. ATA DE REUNIÃO E ALINHAMENTO TÉCNICO PRESENCIAL

**Tabela 1 – Identificação da Reunião de Alinhamento e Homologação Técnica**

| Item | Descrição / Dados do Registro |
| :--- | :--- |
| **Data e Horário** | 18 de Setembro de 2026, das 14h00 às 17h30 (Duração: 3 horas e 30 minutos) |
| **Local** | Estabelecimento Comercial Pop Shake Sorveteria & Açaí Artesanal — Várzea Grande – MT |
| **Participantes Presentes** | **Wilton Gabriel Albuquerque Pereira** (Líder Técnico e Desenvolvedor)<br>**Gerência de Operações da Pop Shake** (Representante Comercial da Entidade Parceira)<br>**Operador de Balcão e Caixa** (Usuário-chave do Painel Operacional)<br>**Responsável de Cozinha / Montagem** (Usuário-chave da Esteira de Produção) |
| **Pauta Principal** | 1. Apresentação do diagnóstico de custos de marketplaces terceirizados.<br>2. Demonstração interativa da vitrine PWA mobile e fluxo de *Fast Access*.<br>3. Demonstração prática do painel Kanban de cozinha e disparo sonoro de pedidos.<br>4. Teste de despacho de corridas diretamente no WhatsApp do entregador.<br>5. Simulação de encerramento de turno de trabalho e conferência de caixa. |

*Fonte: Elaborado pelos autores (2026).*

### Síntese das Deliberações e Demonstrações da Reunião
1. **Demonstração da Vitrine PWA no Celular:** Foi apresentada a vitrine responsiva acessada via navegador móvel, simulando a instalação na tela inicial (*Add to Home Screen*) sem necessidade de download em lojas de aplicativos. Os participantes elogiaram a velocidade de carregamento e a identidade visual atraente em tons de roxo e creme artesanal.
2. **Esteira Kanban e Alerta Sonoro:** Foi posicionado um tablet na área de montagem de açaí. Ao simular um novo pedido no PWA do cliente, o sino de cozinha tocou automaticamente na bancada, e o pedido foi exibido na barra superior de triagem. A equipe comprovou que a visualização rápida dos adicionais reduz o risco de erro na montagem.
3. **Simulação de Despacho Logístico:** O atendente selecionou um entregador cadastrado, digitou a palavra de segurança **"CONFIRMO"** e o sistema abriu imediatamente uma mensagem formatada no WhatsApp contendo a rota traçada no Google Maps, valor a cobrar e link de rastreamento com GPS ao vivo.
4. **Fechamento de Caixa:** O gestor acompanhou a conferência de valores do turno, onde a plataforma demonstrou a segregação exata de faturamento em Dinheiro (com controle de trocos), Cartão na Maquininha e Pix na Entrega.

---

## 3. REGISTRO DE VALIDAÇÃO E FEEDBACK DA ENTIDADE PARCEIRA

### 3.1. Aspectos Elogiados pela Equipe Operacional
- **Eliminação de Comissões Abusivas:** A perspectiva de economizar de 12% a 27% sobre as vendas de delivery e manter 100% da margem líquida foi apontada pela gerência como o maior ganho de sustentabilidade financeira da empresa.
- **Velocidade de Compra para o Cliente:** A equipe de balcão destacou que o fluxo de **Acesso Rápido (*Fast Access*)**, que não obriga a criação de senhas na primeira compra, é crucial para evitar o abandono de carrinho.
- **Agilidade no Despacho via WhatsApp:** O motoboy parceiro presente nos testes elogiou o fato de não precisar instalar um aplicativo pesado no celular, recebendo todos os dados (inclusive o link de rota do Google Maps já com endereço formatado) em sua conversa pessoal de WhatsApp.
- **Sino de Cozinha Inteligente:** O operador ressaltou que a repetição sonora a cada 10 segundos garante que nenhum pedido fique esquecido durante momentos de pico na loja física.

---

### 3.2. Pontos de Atrito Detectados e Ajustes Imediatamente Implementados

**Tabela 2 – Matriz de Feedbacks Coletados e Melhorias Técnicas Implementadas**

| Apontamento do Cliente Parceiro | Impacto no Negócio / Operação | Solução Técnica Desenvolvida e Incorporada |
| :--- | :--- | :--- |
| *"Às vezes o morango ou o leite Ninho acaba no meio da noite e não podemos perder tempo editando o cardápio."* | Risco de vender itens sem estoque ou atrasar a produção na cozinha. | Criado o interruptor (*toggle switch*) instantâneo **"Pausar na Cozinha"** nos módulos de estoque e complementos. Desativa o item da vitrine em tempo real sem apagar dados nem quebrar pedidos passados. |
| *"Temos medo do operador esbarrar a mão na tela touch do tablet e despachar o pedido sem querer."* | Despacho prematuro antes do açaí estar embalado e pronto. | Implementada trava de segurança com confirmação digitada manual: o botão de despacho só é liberado após o operador digitar expressamente a palavra **"CONFIRMO"**. |
| *"No final do turno, não podemos fechar o caixa se algum motoboy ainda estiver na rua com dinheiro para acertar."* | Risco de furo financeiro na conciliação diária de caixa. | Implementado **bloqueio terminante de fechamento** na rota `/api/shifts`: a API rejeita o fechamento com o erro `PENDING_ORDERS_ACTIVE` caso haja qualquer pedido ativo na esteira, listando as pendências. |
| *"O cliente às vezes pede troco para R$ 50,00 e o motoboy não sabe quanto precisa levar de moeda."* | Atrito na porta do cliente e atraso no ciclo de entregas. | Adicionado campo de troco com recálculo automático no checkout e exibição destacada tanto na comanda térmica quanto no template do WhatsApp: *"Troco para: R$ 50,00 • Devolver: R$ 18,00"*. |

*Fonte: Elaborado pelos autores (2026).*

---

## 4. QUADRO CRONOLÓGICO DE ATIVIDADES PRÁTICAS E IMERSÃO DE CAMPO

O plano de trabalho extensionista foi cumprido mediante a realização das atividades práticas descritas no cronograma abaixo, totalizando a carga horária de imersão técnica e validação de requisitos:

**Tabela 3 – Cronograma e Mapeamento de Carga Horária das Atividades de Extensão**

| Data | Carga Horária | Atividade Técnica / Prática Executada | Local / Ambiente | Responsáveis |
| :---: | :---: | :--- | :--- | :--- |
| **12/08/2026** | 4h | Visita técnica inicial, apresentação da proposta extensionista à gerência e diagnóstico das dores com taxas de aplicativos terceiros. | Sede da Pop Shake | Wilton Gabriel e Gerência |
| **19/08/2026** | 6h | Imersão operacional na esteira de cozinha para mapeamento da curva térmica do açaí, tempos de montagem e fluxo de comandas. | Cozinha / Balcão | Wilton Gabriel e Montadores |
| **26/08/2026** | 6h | Coleta e especificação dos requisitos funcionais (32 RFs) e não-funcionais (16 RNFs), modelagem relacional de entidades no Prisma Schema. | Laboratório / Home | Wilton Gabriel |
| **04/09/2026** | 8h | Desenvolvimento da vitrine PWA mobile com componentes touch-first e rotinas anti-tampering no cálculo de preços do checkout. | Laboratório de Dev | Wilton Gabriel |
| **11/09/2026** | 6h | Implementação do painel Kanban de pedidos, testes do sintetizador sonoro de sino de cozinha e rotinas de impressão térmica de 80mm. | Laboratório de Dev | Wilton Gabriel |
| **18/09/2026** | 6h | Sessão presencial de testes com a gerência, validação do despacho via WhatsApp com motoboys e homologação do fechamento de turnos. | Balcão da Pop Shake | Wilton Gabriel, Equipe e Motoboy |
| **25/09/2026** | 4h | Implementação dos ajustes solicitados (Pausa na Cozinha, trava "CONFIRMO" e bloqueio de turnos) e compilação do relatório formal RP1. | Laboratório de Dev | Wilton Gabriel |
| **Total** | **40h** | **Totalização da Carga Horária Prática Extensionista Cumprida** | — | — |

*Fonte: Elaborado pelos autores (2026).*

---

## 5. ROTEIRO DE DEMONSTRAÇÃO E HOMOLOGAÇÃO DAS TELAS

Durante as reuniões práticas presenciais, foram homologados com sucesso os seguintes fluxos e telas do sistema:

1. **Vitrine do Cliente PWA (`/` e `/carrinho`):**
   - Navegação por categorias com fotos em alta definição (formato WebP).
   - Modal dinâmico de montagem de açaí com seleção de tamanhos e acompanhamentos (caldas, frutas e recheios).
   - Cálculo automático de adicionais gratuitos e adicionais cobrados.
   - Checkout com seleção de endereço georreferenciado, cálculo de raio e taxa de entrega.
   - Opções de pagamento: Dinheiro com cálculo de troco, Maquininha de Cartão e Pix na Entrega.
2. **Central Operacional da Cozinha e Balcão (`/admin/pedidos`):**
   - Barra superior de triagem de novos pedidos com indicador sonoro de sino.
   - Colunas Kanban: "Fila", "Em Preparo", "Pronto" e "Em Rota".
   - Impressão térmica monoespaçada de comprovante de produção (80mm).
   - Modal de despacho com confirmação digitada manual e acionador de mensagem no WhatsApp.
3. **Painel de Gestão de Turnos e Estoque (`/admin/historico` e `/admin`):**
   - Abertura de turno com código cronológico (`TURNO-YYYY-MM-DD-XXXX`).
   - Switch operacional "Pausar na Cozinha" com desativação instantânea na vitrine.
   - Bloqueio de fechamento de turno em caso de pedidos pendentes na esteira.
   - Relatório financeiro executivo com conciliação exata de dinheiro, Pix e cartões.

---

## 6. DECLARAÇÃO DE CONCORDÂNCIA E HOMOLOGAÇÃO

A gerência da **Pop Shake Sorveteria & Açaí Artesanal** declara para os devidos fins acadêmicos junto ao **Centro Universitário de Várzea Grande (UNIVAG)** que participou ativamente das etapas de alinhamento, testes e validação da plataforma **PopClub**, atestando que a solução atende com excelência às necessidades operacionais e estratégicas da empresa, encontrando-se pronta para prosseguimento para as etapas finais de homologação e implantação no segundo período letivo (RP2).

<br><br>

__________________________________________________  
**Pop Shake Sorveteria & Açaí Artesanal**  
Representante Operacional / Comercial

<br>

__________________________________________________  
**Wilton Gabriel Albuquerque Pereira**  
Acadêmico Desenvolvedor — ADS / UNIVAG
