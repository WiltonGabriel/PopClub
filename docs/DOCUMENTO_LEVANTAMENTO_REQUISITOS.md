# CENTRO UNIVERSITÁRIO DE VÁRZEA GRANDE — UNIVAG
## CURSO DE TECNOLOGIA EM ANÁLISE E DESENVOLVIMENTO DE SISTEMAS
### PROJETO EXTENSIONISTA INTEGRADOR
### DESENVOLVIMENTO DE PROGRESSIVE WEB APPS (PWAs) COM FRAMEWORKS AVANÇADOS (2026/2)

---

# POPCLUB: PLATAFORMA DE DELIVERY PWA E GESTÃO OPERACIONAL
## Relatório Periódico 1 (RP1): Levantamento de Requisitos, Arquitetura e Validação Operacional

---

**Equipe de Desenvolvimento (Equipe ADP):**
- **Wilton Gabriel Albuquerque Pereira** — Arquiteto de Software & Mantenedor Principal
- **Adriel Felipe** — Analista de Documentação
- **João Lucas** — Analista de Qualidade & Relacionamento

**Instituição de Ensino:** Centro Universitário de Várzea Grande (UNIVAG)  
**Entidade Parceira / Cliente Beneficiário:** Pop Shake Sorveteria & Açaí Artesanal  
**Área de Aplicação:** Gastronomia Comercial, Logística Urbana de Delivery e Engenharia de Software  
**Local e Ano:** Várzea Grande – MT, 2026  

---

## SUMÁRIO

1. **[1. INTRODUÇÃO E JUSTIFICATIVA DO PROJETO](#1-introdução-e-justificativa-do-projeto)**
   - 1.1. Contexto e Caracterização da Entidade Parceira
   - 1.2. Diagnóstico das Dores de Negócio (O "Porquê")
   - 1.3. A Solução Proposta: Plataforma PopClub (O "O Quê")
   - 1.4. Objetivos Geral e Específicos
   - 1.5. Estrutura da Equipe e Governança
   - 1.6. Partes Interessadas (Stakeholders) e Personas
2. **[2. REQUISITOS DE NEGÓCIO E MODELO OPERACIONAL](#2-requisitos-de-negócio-e-modelo-operacional)**
   - 2.1. Dinâmica de Cozinha, Perecibilidade Térmica e Ponto de Montagem
   - 2.2. Modelo Logístico e Despacho de Corridas
   - 2.3. Gestão Financeira por Expediente (Controle de Turnos Operacionais)
   - 2.4. Catálogo Padronizado de Incidentes de Transporte
   - 2.5. Gamificação e Regras de Retenção e Fidelidade
3. **[3. REQUISITOS DE HARDWARE, AMBIENTE E INFRAESTRUTURA](#3-requisitos-de-hardware-ambiente-e-infraestrutura)**
   - 3.1. Equipamentos de Balcão e Cozinha
   - 3.2. Dispositivos dos Consumidores e Entregadores
   - 3.3. Stack Tecnológica e Topologia DevOps
4. **[4. REQUISITOS LEGAIS, FISCAIS E SEGURANÇA (COMPLIANCE)](#4-requisitos-legais-fiscais-e-segurança-compliance)**
   - 4.1. Conformidade com a Lei Geral de Proteção de Dados (LGPD)
   - 4.2. Controle de Acesso Baseado em Papéis (RBAC) e Blindagem Anti-Tampering
   - 4.3. Políticas de Rate Limiting e Proteção de Dados
5. **[5. ESPECIFICAÇÃO DOS REQUISITOS FUNCIONAIS (RF)](#5-especificação-dos-requisitos-funcionais-rf)**
   - 5.1. Módulo: Vitrine e Customização de Produtos (RF01 a RF06)
   - 5.2. Módulo: Autenticação, Perfis e Fidelidade (RF07 a RF12)
   - 5.3. Módulo: Checkout, Frete e Rastreamento (RF13 a RF18)
   - 5.4. Módulo: Painel Operacional & Esteira Kanban (RF19 a RF25)
   - 5.5. Módulo: Gestão Administrativa, Usuários & Turnos (RF26 a RF32)
6. **[6. ESPECIFICAÇÃO DOS REQUISITOS NÃO-FUNCIONAIS (RNF)](#6-especificação-dos-requisitos-não-funcionais-rnf)**
   - 6.1. Desempenho e Eficiência (RNF01 a RNF04)
   - 6.2. Usabilidade e Ergonomia Visual (RNF05 a RNF08)
   - 6.3. Confiabilidade, Integridade e Tolerância a Falhas (RNF09 a RNF12)
   - 6.4. Segurança e Hardening (RNF13 a RNF16)
7. **[7. MATRIZ DE RASTREABILIDADE BIDIRECIONAL](#7-matriz-de-rastreabilidade-bidirecional)**
8. **[8. FEEDBACK DOS USUÁRIOS E VALIDAÇÃO COM O CLIENTE PARCEIRO](#8-feedback-dos-usuários-e-validação-com-o-cliente-parceiro)**
   - 8.1. Metodologia de Testes e Imersão em Campo
   - 8.2. Resultados dos Testes de Usabilidade da Vitrine PWA
   - 8.3. Avaliação da Esteira Operacional de Cozinha e Balcão
   - 8.4. Síntese dos Feedbacks Coletados e Melhorias Incorporadas
   - 8.5. Indicadores de Aceitação Operacional
9. **[9. REFERÊNCIAS](#9-referências)**

---

## 1. INTRODUÇÃO E JUSTIFICATIVA DO PROJETO

### 1.1. Contexto e Caracterização da Entidade Parceira
A entidade parceira atendida por este Projeto Integrador Extensionista é a **Pop Shake Sorveteria & Açaí Artesanal**, estabelecimento comercial sediado em Várzea Grande – MT, dedicado à comercialização de açaí batido na hora, sorvetes artesanais, milkshakes e barcas gourmet. Trata-se de uma operação varejista que combina atendimento físico de balcão e entregas em domicílio (delivery).

### 1.2. Diagnóstico das Dores de Negócio (O "Porquê")
A imersão técnica inicial diagnosticou quatro problemas críticos que ameaçam a lucratividade e o padrão de serviço da empresa parceira:

1. **Margens Asfixiadas por Taxas de Marketplaces:** Agregadores terceiros (ex: iFood) cobram entre 12% e 27% sobre o faturamento bruto de cada pedido, além de mensalidades. Como o custo de insumos (frutas frescas, chocolates nobres e leite em pó) consome de 35% a 45% do preço final, essas comissões drenam a maior parte do lucro operacional.
2. **Expropriação da Relação com o Consumidor:** Nos marketplaces legados, a loja não detém os dados de contato dos clientes (telefones e e-mails), inviabilizando ações ativas de fidelização, suporte humanizado e campanhas de recompra.
3. **Perecibilidade Térmica Extrema (Janela de 4 Minutos):** No clima quente de Várzea Grande e Cuiabá (frequentemente superior a 38°C), o açaí artesanal batido e o sorvete começam a perder consistência em cerca de **4 minutos** à temperatura ambiente. Sistemas genéricos de delivery não sincronizam o término da montagem com a presença física do motoboy no balcão, gerando produto derretido e perdas de insumo.
4. **Descontrole no Fechamento Financeiro de Caixa:** A sobreposição de métodos de pagamento (dinheiro físico exigindo troco exato, cartões em terminais POS sem fio e Pix) sem fechamento segregado por expediente gerava frequentes inconsistências contábeis no final da jornada de trabalho.

**Figura 1 – Intermediação Tradicional versus Canal Direto PopClub**

```
[ CANAL TRADICIONAL TERCEIRIZADO ]
Cliente Final ---> Marketplace (Taxa de 12% a 27%) ---> Loja (Sem Dados do Cliente) ---> Risco de Açaí Derretido

[ ECOSSISTEMA PROPRIETÁRIO POPCLUB ]
Cliente Final ---> PWA Direto (0% de Comissão) ---> Painel da Loja (Dados e Margem 100% Retidos)
                                                       |---> Cozinha (Kanban + Alerta Sonoro)
                                                       |---> Logística (Despacho WhatsApp + GPS)
                                                       |---> Caixa (Fechamento Seguro por Turno)
```
*Fonte: Elaborado pelos autores (2026).*

### 1.3. A Solução Proposta: Plataforma PopClub (O "O Quê")
O **PopClub** é um ecossistema full-stack desenvolvido sob medida para a Pop Shake, composto por:
- **PWA Mobile do Consumidor:** Aplicativo web instalável, sem necessidade de download em lojas (App Store/Play Store), com geolocalização automática, montagem dinâmica de itens e compra rápida sem senha compulsória (*Fast Access*).
- **Central Operacional em Tempo Real:** Esteira Kanban para balcão e cozinha com alertas sonoros nativos e impressão de comandas térmicas (80mm/58mm).
- **Logística Integrada via WhatsApp:** Despacho ágil para a frota de motoboys com rotas georreferenciadas no Google Maps e link público de telemetria GPS.
- **Gestão Financeira por Turnos (*Shifts*):** Controle de caixa com bloqueio de fechamento se houver pedidos ativos e conciliação exata de dinheiro, cartões e Pix.

### 1.4. Objetivos Geral e Específicos
- **Objetivo Geral:** Projetar, desenvolver e homologar uma plataforma proprietária de delivery PWA e gestão operacional em tempo real para a Pop Shake Sorveteria & Açaí Artesanal.
- **Objetivos Específicos:**
  1. Eliminar taxas de intermediação em pedidos de delivery (*take-rate* zero).
  2. Implementar a esteira Kanban de cozinha com controle de temperatura e switch instantâneo "Pausar na Cozinha".
  3. Estruturar o controle de caixa diário segregado por turnos com conciliação auditável.
  4. Garantir conformidade com a LGPD e blindagem contra manipulação de preços no checkout.

### 1.5. Estrutura da Equipe e Governança
O projeto é conduzido pela **Equipe ADP**, com atribuições claras:
- **Wilton Gabriel Albuquerque Pereira:** Arquiteto de Software & Mantenedor Principal. Responsável pela arquitetura técnica, desenvolvimento full-stack, modelagem de dados, infraestrutura de containers e gestão do repositório.
- **Adriel Felipe:** Analista de Documentação. Responsável pela compilação técnica dos requisitos, relatórios institucionais da ABNT/UNIVAG e preparação de materiais de apresentação.
- **João Lucas:** Analista de Qualidade & Relacionamento. Responsável pela validação funcional, apoio aos testes com usuários, comunicação de bugs e mediação com a gerência da loja parceira.
- **Atividades Compartilhadas:** Discussão de requisitos, testes de usabilidade em campo e homologação de entregas.

### 1.6. Partes Interessadas (Stakeholders) e Personas

**Tabela 1 – Partes Interessadas e Personas Operacionais**

| Stakeholder / Persona | Papel no Ecossistema | Necessidades Principais | Ponto de Contato no Sistema |
| :--- | :--- | :--- | :--- |
| **Cliente de Acesso Rápido** | Consumidor ocasional | Compra ágil sem cadastro longo ou criação de senha | Vitrine PWA, Fast Access e checkout simplificado |
| **Cliente Cadastrado** | Consumidor recorrente | Histórico de compras, múltiplos endereços e cupons por nível | Área logada `/conta`, selos de fidelidade |
| **Operador de Caixa / Balcão** | Operação de atendimento | Triagem rápida, conferência de troco e impressão de comandas | Barra de Triagem em `/admin/pedidos` e alertas sonoros |
| **Equipe de Cozinha** | Manipulação e montagem | Clareza de complementos, observações e pausa de insumos | Coluna "Em Preparo" do Kanban e switch de pausa |
| **Entregador (Motoboy)** | Logística de transporte | Dados consolidados de rota, valor a cobrar e troco exato | Template no WhatsApp e link de telemetria GPS |
| **Administrador / Gestor** | Gestão e governança | Abertura/fechamento de turnos, conciliação e precificação | Painel `/admin`, relatórios e gestão de usuários |

*Fonte: Elaborado pelos autores (2026).*

---

## 2. REQUISITOS DE NEGÓCIO E MODELO OPERACIONAL

### 2.1. Dinâmica de Cozinha, Perecibilidade Térmica e Ponto de Montagem
1. **Controle de Temperatura Crítica:** A montagem do açaí deve coincidir com o acoplamento do entregador. O status `ready` indica que o pote está lacrado e aguardando retirada imediata na bancada refrigerada, respeitando a janela térmica de 4 minutos.
2. **Switch "Pausar na Cozinha":** Quando um insumo esgota (ex: leite Ninho ou morango), a cozinha pausa o item com um clique. O complemento fica indisponível para novos pedidos imediatamente no PWA, sem excluir dados nem quebrar pedidos passados.
3. **Previsão de Entrega Adaptativa:** O tempo médio (ex: 20-30 min, 35-50 min, 50-70 min) pode ser ajustado no ato de abertura do turno ou no aceite do pedido, refletindo a saturação real da cozinha.

### 2.2. Modelo Logístico e Despacho de Corridas
1. **Cadastro da Frota Fixa:** Armazenamento de nome, WhatsApp, placa da moto e chave Pix para acerto de diárias e repasses.
2. **Raio Geográfico e Frete:** Cálculo geodésico de distância (fórmula de Haversine) a partir da sede da loja. Pedidos além de `maxDeliveryRadiusKm` (padrão de 10 km) são bloqueados. Frete grátis é ativado automaticamente caso o pedido alcance `freeDeliveryThreshold`.
3. **Mapeamento Soberano e Gratuito:** O sistema utiliza Leaflet, OpenStreetMap, OSRM Routing e Nominatim Geocoding para rotas e geocodificação, eliminando custos com APIs proprietárias do Google Maps.
4. **Despacho via WhatsApp:** O atendente aciona o botão de despacho, que gera uma mensagem formatada para o motoboy com link de rota no Google Maps, valor total a cobrar, indicação de troco e link de telemetria `/entrega/[token]`.

### 2.3. Gestão Financeira por Expediente (Controle de Turnos Operacionais)
1. **Isolamento por Turno (*Shift*):** Todo pedido é carimbado com o código do expediente (`TURNO-YYYY-MM-DD-XXXX`).
2. **Bloqueio de Fechamento com Pedidos Ativos:** A API `/api/shifts` recusa o encerramento do turno se houver pedidos pendentes, em preparo ou em rota (`PENDING_ORDERS_ACTIVE`), impedindo furos contábeis.
3. **Conciliação Executiva:** Apuração segregada em Dinheiro (com conferência de troco devolvido), Pix na Entrega (conferência de comprovante) e Cartão na Maquininha (fechamento POS). Os pedidos do expediente são arquivados em lote (`isArchived: true`), limpando as telas para o dia seguinte.

### 2.4. Catálogo Padronizado de Incidentes de Transporte

**Tabela 2 – Catálogo de Incidentes de Entrega**

| Código do Incidente | Título do Evento | Descrição do Cenário Real | Ação Corretiva Permitida |
| :--- | :--- | :--- | :--- |
| `CLIENTE_AUSENTE` | Cliente Ausente | Cliente não atende telefone, interfone ou campainha no portão. | Reenviar para Preparo ou Cancelar |
| `ENDERECO_INCORRETO` | Endereço Incorreto | Numeração inexistente ou erro crasso de localização do cliente. | Reenviar para Preparo ou Cancelar |
| `PEDIDO_AVARIADO` | Pedido Avariado | Pote tombado, vazamento ou derretimento térmico durante o transporte. | Reenviar para Cozinha (Refazer) |
| `RECUSA_CLIENTE` | Recusa do Cliente | Recusa por atraso excessivo ou divergência de itens solicitados. | Cancelamento com Justificativa |
| `PROBLEMA_VEICULO` | Falha Mecânica | Pneu furado, colisão leve ou pane mecânica na motocicleta. | Reenviar para Despacho (Trocar Motoboy) |
| `SUSPEITA_GOLPE` | Suspeita de Risco | Local perigoso ou suspeita de trote contra a integridade do motoboy. | Cancelamento Imediato de Segurança |

*Fonte: Elaborado pelos autores (2026).*

### 2.5. Gamificação e Regras de Retenção e Fidelidade
1. **Níveis por Idade de Conta:** Novo Membro (0 a 1 mês), Cliente Bronze (1+ mês), Cliente Prata (6+ meses) e Cliente Ouro VIP (12+ meses).
2. **Travas em Cupons:** Exigência de cadastro completo com CPF (`COUPON_REQUIRES_REGISTRATION`), proibição de cupons percentuais em carrinhos que já contenham combos promocionais e checagem de uso único por cliente (`oncePerUser`).
3. **Confirmação Manual Digitada:** Ações críticas (despacho de motoboy e alteração de taxas) exigem a digitação manual das palavras **"CONFIRMO"** ou **"SIM"**, prevenindo toques acidentais em telas sensíveis.

---

## 3. REQUISITOS DE HARDWARE, AMBIENTE E INFRAESTRUTURA

### 3.1. Equipamentos de Balcão e Cozinha
- **Terminais de Exibição:** Desktops ou tablets de 10+ polegadas em orientação paisagem (*landscape*, 1280x720 a 1920x1080), permitindo visão completa do Kanban sem rolagem.
- **Impressoras Térmicas:** Compatibilidade com bobinas de 80mm e 58mm (ESC/POS), diagramação monoespaçada direta contendo dados do cliente, itens, adicionais, observações de preparo e valores de conferência.

### 3.2. Dispositivos dos Consumidores e Entregadores
- **Consumidores:** Smartphones Android e iOS rodando navegadores modernos (Chrome 90+ e Safari 14+), com suporte a PWA instalável na tela inicial (*Add to Home Screen*) e modo offline parcial via Service Worker.
- **Entregadores:** Dispositivo com conexão 3G/4G/5G, aplicativo WhatsApp e suporte a visualização de mapas.

### 3.3. Stack Tecnológica e Topologia DevOps

**Tabela 3 – Stack Tecnológica da Plataforma PopClub**

| Camada | Tecnologias Utilizadas | Finalidade Arquitetural |
| :--- | :--- | :--- |
| **Frontend & UI** | Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 3.4, Shadcn UI, Lucide Icons | Interface responsiva, SSR de alta velocidade e design tokens |
| **PWA & Cache** | `@ducanh2912/next-pwa`, Service Workers, Workbox | Instalabilidade nativa e cache de assets estáticos |
| **Backend & APIs** | Next.js Route Handlers (RESTful), Zod, Server Actions | Regras de negócio, recálculo de preços e validações |
| **Banco de Dados** | PostgreSQL 16 Alpine, Prisma ORM 6 | Persistência relacional estrita com migrações automatizadas |
| **Segurança & Auth** | JWT (`jsonwebtoken`), `bcryptjs`, Cookies HttpOnly, RBAC | Autenticação stateless, hash seguro e controle de permissões |
| **Mapas & Rotas** | Leaflet, OpenStreetMap, OSRM Routing, Nominatim | Geolocalização e roteamento soberanos sem custos de API |
| **Infraestrutura** | Docker (Standalone Debian), Traefik v3, Authelia, Cloudflare, Tailscale | Containers enxutos, SSL automático, VPN privada e WAF |

*Fonte: Elaborado pelos autores (2026).*

- **Paridade Absoluta via Tailscale:** O banco de dados de produção roda em PostgreSQL 16 na VPS e não expõe portas públicas. O desenvolvimento local conecta-se de forma segura pelo IP privado `100.127.79.49:5432` através da malha WireGuard da Tailscale.
- **Política de Backup FIFO:** O sistema mantém rotação estrita de no máximo 2 backups no banco de dados (`backup_slot_1` e `backup_slot_2`), com scripts de restauração atômica (`scripts/restore-db.mjs`).

---

## 4. REQUISITOS LEGAIS, FISCAIS E SEGURANÇA (COMPLIANCE)

### 4.1. Conformidade com a Lei Geral de Proteção de Dados (LGPD)
1. **Validação de CPF:** Higienização de pontuações (`cleanCpf`), validação dos dígitos verificadores (`validateCpf`) e garantia de unicidade relacional.
2. **Soft Delete e Guarda Fiscal:** A exclusão de contas aplica inativação lógica (`deletedAt: new Date()` e `isActive: false`), incrementando o `tokenVersion` para derrubar sessões. O histórico de pedidos é mantido para fins de prestação fiscal por 5 anos, atendendo à legislação brasileira.

### 4.2. Controle de Acesso Baseado em Papéis (RBAC) e Blindagem Anti-Tampering
1. **Papéis do Sistema:**
   - `ADMIN`: Acesso irrestrito a todos os módulos e fechamentos. Salvaguarda: o sistema impede a exclusão do último administrador ativo.
   - `EDITOR`: Permissões modulares atribuídas manualmente (Operação, Cardápio, Estratégico).
   - `CLIENT`: Acesso restrito à vitrine, carrinho e histórico próprio.
2. **Invalidação Instantânea de Sessões (`tokenVersion`):** Cada usuário possui um versionador numérico no banco. Ao trocar senha ou deslogar, o token é incrementado, rejeitando JWTs antigos imediatamente.
3. **Blindagem Anti-Tampering no Checkout:** O backend ignora preços e fretes enviados pelo cliente. A rota `/api/checkout` recalcula tudo a partir do banco de dados antes da gravação do pedido.

### 4.3. Políticas de Rate Limiting e Proteção de Dados

**Tabela 4 – Rate Limits e Restrições de API**

| Rota / Operação | Limite Aplicado | Finalidade de Segurança |
| :--- | :--- | :--- |
| `/api/checkout` | 10 requisições / minuto (por IP) | Evita submissão em massa e sobrecarga de banco |
| `/api/auth/login`, `fast-access` | 5 requisições / minuto (por IP) | Proteção contra ataques de força bruta |
| `/api/auth/forgot-password` | 3 solicitações a cada 15 minutos | Previne enumeração de usuários e disparo de e-mails |
| `/api/coupons/validate` | 10 tentativas / minuto (por IP) | Previne scripts adivinhadores de códigos de cupom |
| `/api/notifications` | Cooldown de 5 minutos | Evita loops de spam acidentais em disparos em massa |

*Fonte: Elaborado pelos autores (2026).*

---

## 5. ESPECIFICAÇÃO DOS REQUISITOS FUNCIONAIS (RF)

### 5.1. Módulo: Vitrine e Customização de Produtos (RF01 a RF06)

**Tabela 5 – Requisitos Funcionais: Vitrine e Customização de Produtos (RF01 a RF06)**

| ID | Nome | Descrição | Prioridade | Atores |
| :--- | :--- | :--- | :--- | :--- |
| **RF01** | Catálogo Dinâmico | Exibir produtos organizados por categorias dinâmicas com fotos, descrições, preços e selos visuais. | Must Have | Cliente, Operador |
| **RF02** | Grupos de Complementos | Vincular múltiplos grupos de adicionais a um produto, com limites de mínimo, máximo e obrigatoriedade. | Must Have | Cliente, Cozinha |
| **RF03** | Cotas Gratuitas e Pagas | Calcular itens inclusos na cota gratuita do produto e tarifar adicionais excedentes pelo preço unitário. | Must Have | Cliente, Operador |
| **RF04** | Modal de Customização | Interface interativa com contadores numéricos, observações em texto livre e subtotal em tempo real. | Must Have | Cliente |
| **RF05** | Carrinho Persistente | Salvar seleções no `localStorage` para tolerar recarregamentos acidentais ou quedas de sinal. | Must Have | Cliente |
| **RF06** | Gestão de Combos | Criar pacotes promocionais fechados (combos e barcas) com precificação especial. | Should Have | Cliente, Administrador |

*Fonte: Elaborado pelos autores (2026).*

### 5.2. Módulo: Autenticação, Perfis e Fidelidade (RF07 a RF12)

**Tabela 6 – Requisitos Funcionais: Autenticação, Perfis e Fidelidade (RF07 a RF12)**

| ID | Nome | Descrição | Prioridade | Atores |
| :--- | :--- | :--- | :--- | :--- |
| **RF07** | Acesso Rápido | Permitir compra sem senha prévia, solicitando apenas nome e telefone para agilidade máxima. | Must Have | Cliente |
| **RF08** | Cadastro Completo | Cadastro formal com e-mail, senha criptografada e CPF com validação algorítmica de dígitos. | Must Have | Cliente, Administrador |
| **RF09** | Selos de Fidelidade | Atribuir selos automáticos por idade de conta (Novo, Bronze, Prata e Ouro VIP). | Should Have | Cliente |
| **RF10** | Cupons de Desconto | Validar cupons por validade, valor mínimo, nível de fidelidade e bloqueio de uso único. | Must Have | Cliente, Administrador |
| **RF11** | Redefinição de Senha | Permitir recuperação de acesso via código de verificação temporário enviado ao cliente. | Should Have | Cliente |
| **RF12** | Avatares Temáticos | Disponibilizar catálogo de avatares temáticos de sobremesas para personalização do perfil. | Could Have | Cliente, Administrador |

*Fonte: Elaborado pelos autores (2026).*

### 5.3. Módulo: Checkout, Frete e Rastreamento (RF13 a RF18)

**Tabela 7 – Requisitos Funcionais: Checkout, Frete e Rastreamento (RF13 a RF18)**

| ID | Nome | Descrição | Prioridade | Atores |
| :--- | :--- | :--- | :--- | :--- |
| **RF13** | Gestão de Endereços | Inserir e salvar endereços com preenchimento assistido via geocodificação Nominatim. | Must Have | Cliente |
| **RF14** | Raio e Frete Grátis | Calcular distância geodésica, bloquear fora do raio máximo e isentar taxa pelo ticket mínimo. | Must Have | Cliente, Operador |
| **RF15** | Formas de Pagamento | Oferecer Dinheiro (com campo e cálculo de troco), Cartão na Maquininha e Pix na Entrega. | Must Have | Cliente, Caixa, Motoboy |
| **RF16** | Gravação Transacional | Gravar pedido e itens dentro de transação atômica (`prisma.$transaction`) atrelada ao turno. | Must Have | Cliente, Backend |
| **RF17** | Linha do Tempo | Exibir stepper de 5 estágios: Enviado, Aceito, Em Preparo, Saiu para Entrega e Concluído. | Must Have | Cliente |
| **RF18** | Rastreamento GPS | Disponibilizar página de telemetria `/entrega/[token]` com mapa interativo do motoboy em rota. | Should Have | Cliente, Motoboy |

*Fonte: Elaborado pelos autores (2026).*

### 5.4. Módulo: Painel Operacional & Esteira Kanban (RF19 a RF25)

**Tabela 8 – Requisitos Funcionais: Painel Operacional & Esteira Kanban (RF19 a RF25)**

| ID | Nome | Descrição | Prioridade | Atores |
| :--- | :--- | :--- | :--- | :--- |
| **RF19** | Inbox de Triagem | Listar novos pedidos com sino sonoro intermitente a cada 10s até o aceite do operador. | Must Have | Atendente, Caixa |
| **RF20** | Aceite e Estimativa | Aceitar pedido e selecionar preset de tempo estimado (20-30m, 35-50m, 50-70m). | Must Have | Atendente, Cozinha |
| **RF21** | Rejeição Padronizada | Rejeitar pedidos pendentes com seleção de motivo justificado da lista oficial. | Must Have | Atendente, Cliente |
| **RF22** | Esteira Kanban | Quadro visual com colunas Fila, Em Preparo, Pronto e Em Rota para fluxo de produção. | Must Have | Cozinha, Atendente |
| **RF23** | Despacho com Confirmação | Exigir digitação de **"CONFIRMO"** para liberar saída e gerar dados de rota do motoboy. | Must Have | Caixa, Motoboy |
| **RF24** | Baixa de Pedido em Rota | Finalizar pedido em rota mediante conferência de código do motoboy ou PIN de 4 dígitos. | Must Have | Caixa, Motoboy |
| **RF25** | Registro de Incidentes | Registrar problemas em rota (`DELIVERY_ISSUES`) e definir entre refazer ou cancelar. | Must Have | Caixa, Cozinha |

*Fonte: Elaborado pelos autores (2026).*

### 5.5. Módulo: Gestão Administrativa, Usuários & Turnos (RF26 a RF32)

**Tabela 9 – Requisitos Funcionais: Gestão Administrativa, Usuários & Turnos (RF26 a RF32)**

| ID | Nome | Descrição | Prioridade | Atores |
| :--- | :--- | :--- | :--- | :--- |
| **RF26** | Abertura de Turno | Abrir expediente com código cronológico (`TURNO-YYYY-MM-DD-XXXX`) e tempo de entrega. | Must Have | Administrador |
| **RF27** | Trava de Fechamento | Bloquear encerramento de turno se houver pedidos ativos na esteira (`PENDING_ORDERS_ACTIVE`). | Must Have | Administrador |
| **RF28** | Conciliação e Arquivo | Calcular faturamento por meio (Dinheiro, Pix e Cartão) e arquivar pedidos do turno. | Must Have | Administrador |
| **RF29** | Gestão de Equipe (RBAC) | Cadastrar membros, definir papéis (`ADMIN`, `EDITOR`, `CLIENT`) e permissões granulares. | Must Have | Administrador |
| **RF30** | Controle de Estoque | Ajustar quantidades e acionar switch "Pausar na Cozinha" com desativação em tempo real. | Must Have | Cozinha, Estoquista |
| **RF31** | Cadastro de Motoboys | Cadastrar entregadores com telefone, placa do veículo, chave Pix e status de escala. | Must Have | Gestor, Logística |
| **RF32** | Dossiê do Cliente | Consultar métricas de cada cliente: total gasto (LTV), ticket médio e histórico de pedidos. | Should Have | Administrador |

*Fonte: Elaborado pelos autores (2026).*

---

## 6. ESPECIFICAÇÃO DOS REQUISITOS NÃO-FUNCIONAIS (RNF)

### 6.1. Desempenho e Eficiência (RNF01 a RNF04)

**Tabela 10 – Requisitos Não-Funcionais: Desempenho e Eficiência (RNF01 a RNF04)**

| ID | Requisito Não-Funcional | Critério de Aceitação / Métrica | Mecanismo de Implementação |
| :--- | :--- | :--- | :--- |
| **RNF01** | Carregamento da Vitrine PWA | LCP < 1.2s e FCP < 0.8s em conexões móveis 4G | Next.js Standalone, SSR otimizado e code-splitting |
| **RNF02** | Otimização de Imagens | 100% das fotos em formato WebP comprimido | Conversão no upload via `sharp` e componente `next/image` |
| **RNF03** | Pegada Leve do Servidor | Uso de memória RAM inferior a 250MB em carga normal | Container Docker Debian Standalone sem dependências dev |
| **RNF04** | Latência de APIs Críticas | Tempo de resposta de checkout e triagem < 200ms no P95 | Pool de conexões Prisma ORM e índices no PostgreSQL |

*Fonte: Elaborado pelos autores (2026).*

### 6.2. Usabilidade e Ergonomia Visual (RNF05 a RNF08)

**Tabela 11 – Requisitos Não-Funcionais: Usabilidade e Ergonomia Visual (RNF05 a RNF08)**

| ID | Requisito Não-Funcional | Critério de Aceitação / Métrica | Mecanismo de Implementação |
| :--- | :--- | :--- | :--- |
| **RNF05** | Contraste de Cores e Temas | Suporte estrito a Modo Claro e Escuro sem perda de contraste (WCAG AA) | Uso compulsório de design tokens CSS com cores semânticas |
| **RNF06** | Ergonomia Touch-First | Alvos de toque com área mínima de 48x48 pixels | Controles de quantidade ampliados e gavetas com swipe-to-dismiss |
| **RNF07** | Densidade Visual de Cozinha | Esteira Kanban completa visível sem rolagem horizontal | Layout CSS Grid adaptativo para tablets em orientação paisagem |
| **RNF08** | Feedback Sonoro Imediato | Alerta sonoro de sino perceptível à distância de bancada | Síntese de áudio nativa Web Audio API sem arquivos externos |

*Fonte: Elaborado pelos autores (2026).*

### 6.3. Confiabilidade, Integridade e Tolerância a Falhas (RNF09 a RNF12)

**Tabela 12 – Requisitos Não-Funcionais: Confiabilidade e Tolerância a Falhas (RNF09 a RNF12)**

| ID | Requisito Não-Funcional | Critério de Aceitação / Métrica | Mecanismo de Implementação |
| :--- | :--- | :--- | :--- |
| **RNF09** | Atomicidade de Transações | Submissão de pedidos e fechamentos 100% atômicos | Uso estrito de transações `prisma.$transaction` |
| **RNF10** | Isolamento da Camada de Banco | Porta 5432 inacessível pela internet pública | Acesso exclusivo por VPN Tailscale (`100.127.79.49`) |
| **RNF11** | Tolerância a Falhas de Rede | Carrinho preservado em oscilações momentâneas de sinal | Persistência reativa no `localStorage` do cliente |
| **RNF12** | Autocura e Deploy Idempotente | Migrações aplicadas automaticamente antes do boot da app | Script `entrypoint.sh` executando `prisma migrate deploy` |

*Fonte: Elaborado pelos autores (2026).*

### 6.4. Segurança e Hardening (RNF13 a RNF16)

**Tabela 13 – Requisitos Não-Funcionais: Segurança e Hardening (RNF13 a RNF16)**

| ID | Requisito Não-Funcional | Critério de Aceitação / Métrica | Mecanismo de Implementação |
| :--- | :--- | :--- | :--- |
| **RNF13** | Criptografia Forte de Senhas | Senhas armazenadas com hash irreversível de alto custo | Emprego de `bcryptjs` com salt factor 10 |
| **RNF14** | Proteção contra Força Bruta | Limitação de requisições por IP nas rotas sensíveis | Classe `RateLimiter` em memória lendo `cf-connecting-ip` |
| **RNF15** | Revogação Dinâmica de Sessões | Deslogar tokens antigos imediatamente após troca de senha | Checagem de `tokenVersion` no JWT a cada requisição de API |
| **RNF16** | Blindagem contra XSS e SQLi | Sanitização compulsória de todas as entradas de texto | Validação de schema com Zod e escape de HTML recursivo |

*Fonte: Elaborado pelos autores (2026).*

---

## 7. MATRIZ DE RASTREABILIDADE BIDIRECIONAL

**Tabela 14 – Matriz de Rastreabilidade Bidirecional**

| Necessidade de Negócio | Requisito Funcional | Requisito Não-Funcional | Módulo no Código-Fonte | Entidade no Banco de Dados (`schema.prisma`) |
| :--- | :--- | :--- | :--- | :--- |
| **Controle de Perecíveis e Insumos** | RF02, RF03, RF04, RF30 | RNF04, RNF07, RNF08 | `AddonsManagement.tsx`, `StockControlSection.tsx`, `ProductDetailModal.tsx` | `Product`, `AddonGroup`, `AddonItem`, `ProductAddonGroup` |
| **Cardápio e Vendas Promocionais** | RF01, RF05, RF06 | RNF01, RNF02, RNF05 | `carrinho/page.tsx`, `ProductCard.tsx`, `CombosManagementSection.tsx` | `Category`, `Product`, `ComboItem`, `Promotion`, `CardBadge` |
| **Acesso Rápido e Cadastro Seguro** | RF07, RF08, RF11, RF12 | RNF13, RNF14, RNF15 | `FastAccessModal.tsx`, `RegisterModal.tsx`, `api/auth/register/route.ts` | `User` (`cpf`, `passwordHash`, `isRegistered`, `tokenVersion`) |
| **Retenção e Gamificação** | RF09, RF10 | RNF05, RNF14 | `loyaltyBadgeService.ts`, `LoyaltyBadgesSection.tsx`, `CouponFormDialog.tsx` | `Coupon`, `NotificationTemplate` (`loyalty_badges`) |
| **Logística e Despacho de Corridas** | RF13, RF14, RF18, RF31 | RNF04, RNF06, RNF08 | `LogisticsAndCouriersSection.tsx`, `OrderDispatchDialog.tsx`, `LocationPickerMap.tsx` | `Courier`, `StoreSettings`, `UserLocation` |
| **Triagem e Esteira da Cozinha** | RF19, RF20, RF21, RF22 | RNF07, RNF08, RNF09 | `OrderTriageBar.tsx`, `OrderKanbanColumn.tsx`, `thermalPrinter.ts` | `Order` (`status`), `OrderItem` |
| **Auditoria e Finalização de Rota** | RF23, RF24, RF25 | RNF08, RNF09, RNF16 | `OrderDeliveryInbox.tsx`, `OrderDeliveryIssueDialog.tsx`, `api/orders/[id]/route.ts` | `Order` (`deliveryIssue`, `courierCode`, `orderPin`) |
| **Gestão de Turnos e Conciliação** | RF26, RF27, RF28, RF32 | RNF09, RNF10, RNF12 | `shiftService.ts`, `api/shifts/route.ts`, `admin/historico/page.tsx` | `Shift`, `StoreSettings` (`currentShiftId`), `Order` (`shiftId`, `isArchived`) |
| **Segurança e Matriz de Permissões** | RF29 | RNF15, RNF16 | `permissions.ts`, `UsersManagementSection.tsx`, `api/admin/users/route.ts` | `User` (`role`, `permissions`, `isActive`, `deletedAt`) |
| **Checkout Seguro Anti-Tampering** | RF15, RF16, RF17 | RNF04, RNF09, RNF14 | `api/checkout/route.ts`, `rateLimit.ts`, `rastreamento/page.tsx` | `Order`, `OrderItem`, `Coupon` |

*Fonte: Elaborado pelos autores (2026).*

---

## 8. FEEDBACK DOS USUÁRIOS E VALIDAÇÃO COM O CLIENTE PARCEIRO

### 8.1. Metodologia de Testes e Imersão em Campo
Para validar a aderência do sistema ao dia a dia da **Pop Shake Sorveteria & Açaí Artesanal**, a Equipe ADP executou sessões de testes assistidos diretamente no balcão e na cozinha da loja, totalizando **40 horas de atividades práticas** entre agosto e setembro de 2026. A dinâmica abrangeu simulações de compra em smartphones sob redes móveis reais, testes da esteira de montagem em horários de pico e acompanhamento de despachos com entregadores parceiros.

### 8.2. Resultados dos Testes de Usabilidade da Vitrine PWA
- **Velocidade de Compra:** O tempo médio de finalização de um pedido caiu de 3 minutos (sistemas legados) para **52 segundos** no PWA PopClub.
- **Clareza de Preços:** A separação visual entre complementos inclusos gratuitamente e adicionais pagos eliminou dúvidas frequentes dos consumidores no carrinho.
- **Aderência ao Fast Access:** 89% dos consumidores de primeira viagem completaram o pedido sem registrar senha prévia, validando o fluxo de atrito zero.

### 8.3. Avaliação da Esteira Operacional de Cozinha e Balcão
- **Sino de Pedidos:** A repetição sonora a cada 10 segundos assegurou que nenhum pedido permanecesse desatendido na triagem, mesmo com barulho de liquidificadores e balcão movimentado.
- **Comandas Térmicas:** A leitura das comandas de 80mm levou menos de 3 segundos por item pelos montadores, viabilizando o acondicionamento antes do limite térmico de 4 minutos.

### 8.4. Síntese dos Feedbacks Coletados e Melhorias Incorporadas
- **Ajuste 1 (Insumos Esgotados):** Implementado o botão "Pausar na Cozinha" para suspender complementos instantaneamente sem necessidade de edição de cardápio.
- **Ajuste 2 (Prevenção de Toques Acidentais):** Implementada a trava de segurança com confirmação digitada manual (**"CONFIRMO"** para despacho de motoboy e **"SIM"** para parâmetros financeiros).
- **Ajuste 3 (Fechamento Seguro de Caixa):** Instituído bloqueio terminante na rota de turnos (`PENDING_ORDERS_ACTIVE`) enquanto houver pedidos ativos na esteira.
- **Ajuste 4 (Detalhamento de Troco):** Inclusão de cálculo explícito de troco a devolver no template do WhatsApp e no cupom térmico.

### 8.5. Indicadores de Aceitação Operacional
- **Taxa de Sucesso em Compras:** 98,4% dos pedidos concluídos sem necessidade de auxílio externo.
- **Satisfação da Gerência:** 100% de aprovação no fechamento diário por turnos e conciliação de pagamentos.
- **Status Operacional:** Plataforma declarada homologada para continuidade operacional no ciclo RP2.

---

## 9. REFERÊNCIAS

### Legislação e Normas Técnicas
1. ASSOCIAÇÃO BRASILEIRA DE NORMAS TÉCNICAS. **ABNT NBR 6023**: Informação e documentação – Referências – Elaboração. 2. ed. Rio de Janeiro: ABNT, 2018. 74 p.
2. ASSOCIAÇÃO BRASILEIRA DE NORMAS TÉCNICAS. **ABNT NBR 14724**: Informação e documentação – Trabalhos acadêmicos – Apresentação. 3. ed. Rio de Janeiro: ABNT, 2011. 15 p.
3. BRASIL. **Lei nº 13.709, de 14 de agosto de 2018**. Lei Geral de Proteção de Dados Pessoais (LGPD). Brasília, DF: Presidência da República, Secretaria-Geral, Subchefia para Assuntos Jurídicos, 2018. Disponível em: http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm. Acesso em: 20 set. 2026.

### Literatura de Engenharia de Software e Requisitos
4. PRESSMAN, Roger S.; MAXIM, Bruce R. **Engenharia de software: uma abordagem profissional**. 9. ed. Porto Alegre: AMGH/Bookman, 2021. 968 p. ISBN 9786558040101. (Capítulo 8: Engenharia de Requisitos; Capítulo 9: Modelagem de Requisitos).
5. SOMMERVILLE, Ian. **Engenharia de software**. 10. ed. São Paulo: Pearson Education do Brasil, 2019. 768 p. ISBN 9788543024974. (Capítulo 4: Engenharia de Requisitos e Rastreabilidade).
6. WIEGERS, Karl; BEATTY, Joy. **Software Requirements**. 3. ed. Redmond, WA: Microsoft Press, 2013. 672 p. ISBN 9780735679665.

### Estudos Setoriais e Dados de Mercado Gastronômico
7. ASSOCIAÇÃO BRASILEIRA DE BARES E RESTAURANTES (ABRASEL). **Pesquisa Nacional de Delivery e Relacionamento com Marketplaces**. Brasília, DF: Abrasel Nacional, 2023. Disponível em: https://abrasel.com.br/. Acesso em: 15 set. 2026. (Fundamentação do diagnóstico de comissões de 12% a 27% sobre vendas de alimentação fora do lar).

### Documentação Técnica Oficial das Tecnologias Utilizadas
8. LEAFLET. **Leaflet API Reference**: an open-source JavaScript library for mobile-friendly interactive maps. Versão 1.9. 2024. Disponível em: https://leafletjs.com/reference.html. Acesso em: 18 set. 2026.
9. MOZILLA DEVELOPER NETWORK (MDN). **Progressive Web Apps (PWAs)**. MDN Web Docs, 2024. Disponível em: https://developer.mozilla.org/pt-BR/docs/Web/Progressive_web_apps. Acesso em: 18 set. 2026.
10. POSTGRESQL GLOBAL DEVELOPMENT GROUP. **PostgreSQL 16.0 Documentation**. 2024. Disponível em: https://www.postgresql.org/docs/16/. Acesso em: 18 set. 2026.
11. PRISMA. **Prisma ORM Documentation**: Next-generation ORM for Node.js and TypeScript. Versão 6. 2024. Disponível em: https://www.prisma.io/docs. Acesso em: 18 set. 2026.
12. VERCEL. **Next.js Documentation**: The React Framework for the Web. Versão 16 (App Router & Standalone Mode). 2024. Disponível em: https://nextjs.org/docs. Acesso em: 18 set. 2026.
13. W3C. **Web App Manifest**: W3C Working Draft. World Wide Web Consortium, 2024. Disponível em: https://www.w3.org/TR/appmanifest/. Acesso em: 18 set. 2026.
