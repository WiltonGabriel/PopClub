# MINUTA DE TEXTO PARA ENVIO NO AMBIENTE VIRTUAL DE APRENDIZAGEM (AVA / MOODLE)
## TAREFA 2: RELATÓRIO PERIÓDICO 1 (RP1) — PROJETO EXTENSIONISTA INTEGRADOR (2026/2)

---

### IDENTIFICAÇÃO DO PROJETO E INTEGRANTES
- **Instituição:** Centro Universitário de Várzea Grande (UNIVAG)
- **Curso:** Tecnologia em Análise e Desenvolvimento de Sistemas (TADS)
- **Disciplina:** Projeto Extensionista Integrador — Desenvolvimento de Progressive Web Apps (PWAs) com Frameworks Avançados (Semestre 2026/2)
- **Título do Projeto:** POPCLUB: Plataforma de Delivery PWA e Gestão Operacional para Pequenos Negócios Gastronômicos
- **Entidade Parceira / Cliente Beneficiário:** Pop Shake Sorveteria & Açaí Artesanal (Várzea Grande – MT)
- **Equipe de Desenvolvimento (Equipe ADP):**
  - **Wilton Gabriel Albuquerque Pereira** — Arquiteto de Software & Mantenedor Principal
  - **Adriel Felipe** — Analista de Documentação
  - **João Lucas** — Analista de Qualidade & Relacionamento

---

### TEXTO PARA COPIAR E COLAR NO CAMPO DE SUBMISSÃO DO AVA (MOODLE):

Prezado(a) Professor(a) e Banca Avaliadora,

Apresentamos a entrega formal da **Tarefa 2 (Relatório Periódico 1 - RP1)** do nosso Projeto Extensionista Integrador, desenvolvido junto à empresa parceira **Pop Shake Sorveteria & Açaí Artesanal**, sediada em Várzea Grande – MT.

---

#### 1. RESUMO EXECUTIVO DAS ENTREGAS TÉCNICAS E DE CAMPO
Neste primeiro ciclo (RP1), foram concluídas com êxito as fases de diagnóstico situacional, imersão prática de campo, engenharia de requisitos detalhada e prototipação funcional da plataforma **PopClub**:

- **Engenharia de Requisitos Exaustiva:** Especificação formal de **32 Requisitos Funcionais (RF01 a RF32)** e **16 Requisitos Não-Funcionais (RNF01 a RNF16)** no padrão ABNT / UNIVAG Anexo III, com matriz de rastreabilidade bidirecional correlacionando regras de negócio, componentes do código e tabelas do banco de dados relacional (`schema.prisma`).
- **Arquitetura e Infraestrutura de Produção:** Aplicação em modo **Next.js 16 Standalone (Node.js 20, React 19)** integrada ao **Prisma ORM 6**, banco de dados **PostgreSQL 16 Alpine**, proxy reverso **Traefik v3** com SSL automático Let's Encrypt, arquitetura de segurança nativa Zero Trust (RBAC, JWT em cookies HttpOnly, Rate Limiting), mapas gratuitos com **Leaflet / OpenStreetMap / OSRM** e isolamento seguro da camada de banco via rede mesh **Tailscale (WireGuard)**.
- **Vitrine PWA Mobile Touch-First:** Progressive Web App de alta performance com suporte estrito aos modos claro e escuro (WCAG AA), fluxo de **Acesso Rápido (*Fast Access*)** com compra sem fricção cadastral, seleção dinâmica de adicionais (cálculo de cotas gratuitas e itens pagos) e blindagem contra manipulação de preços no checkout (*anti-tampering* no backend).
- **Central Operacional de Balcão e Cozinha:** Esteira visual **Kanban** com colunas dinâmicas (Fila, Em Preparo, Pronto e Em Rota), alertas sonoros nativos via Web Audio API (sino de cozinha), geração de comandas térmicas padronizadas (80mm e 58mm) e switch instantâneo **"Pausar na Cozinha"** para insumos esgotados.
- **Logística e Despacho via WhatsApp:** Despacho ágil diretamente no WhatsApp dos motoboys cadastrados contendo rota traçada no Google Maps, valor a cobrar com troco discriminado e link seguro de telemetria com GPS ao vivo (`/entrega/[token]`).
- **Gestão Financeira por Expediente (Shifts):** Controle de turnos operacionais com **bloqueio terminante de fechamento** em caso de pedidos ativos na esteira (`PENDING_ORDERS_ACTIVE`) e conciliação financeira segregada em Dinheiro (com controle de trocos), Cartão na Maquininha e Pix na Entrega.

---

#### 2. LINKS OFICIAIS DE CONSULTA E AUDITORIA DO PROJETO
Para avaliação completa do código-fonte e dos artefatos documentais formais, disponibilizamos os seguintes canais oficiais:

- 💻 **Repositório Oficial no GitHub (Código-Fonte Completo e Histórico de Commits):**  
  👉 https://github.com/WiltonGabriel/PopClub

- 📄 **Documento Técnico de Levantamento e Engenharia de Requisitos (Normas ABNT/UNIVAG):**  
  👉 Arquivo: `docs/DOCUMENTO_LEVANTAMENTO_REQUISITOS.md` no repositório.

- 📝 **Relatório Comprobatório de Evidências de Campo, Atas e Feedback do Cliente:**  
  👉 Arquivo: `docs/EVIDENCIAS_E_FEEDBACK_CLIENTE.md` no repositório.

- 📁 **Pasta Oficial do Google Drive (Documentação em PDF/DOCX, Atas Assinadas e Evidências Fotográficas):**  
  👉 https://drive.google.com/drive/folders/1iw4oxwSWsKvCcCP9YZipzOM0B2B7JmdR?usp=sharing  
  *(Nota: Todos os relatórios, capturas das telas operacionais no balcão e documentos comprobatórios encontram-se organizados e com permissão pública de visualização).*

---

#### 3. DESAFIOS E PROBLEMAS DE ENGENHARIA SUPERADOS
Durante as atividades práticas de campo e desenvolvimento, superamos três desafios técnicos centrais:
1. **Blindagem Anti-Tampering no Checkout:** Garantir que tentativas maliciosas de alteração de preço no navegador do cliente fossem completamente inócuas, delegando 100% do cálculo de produtos, complementos pagos e frete ao servidor a partir do banco de dados.
2. **Sensibilidade Térmica e Sincronismo da Cozinha:** Adequar a esteira para a perecibilidade acelerada do açaí artesanal batido na hora (que perde consistência em ~4 minutos no calor da região de Cuiabá e Várzea Grande), desenvolvendo o status "Pronto" e o acoplamento do entregador antes da retirada do freezer.
3. **Conciliação de Fechamento de Turno:** Eliminar furos de caixa impedindo que operadores encerrassem o turno sem a baixa de pedidos em trânsito com motoboys, garantindo a exatidão dos valores de gaveta e comprovantes bancários.

---

#### 4. PRÓXIMOS PASSOS E METAS PARA O RELATÓRIO PERIÓDICO 2 (RP2)
Para o fechamento do projeto no segundo ciclo, estão planejadas as seguintes ações:
- **Homologação Final da Telemetria GPS com a Frota de Motoboys:** Testes de campo em rotas reais de entrega com envio contínuo de coordenadas em background.
- **Bateria de Testes de Carga e Estresse:** Simulação de picos de pedidos simultâneos no PWA para validação de estabilidade do container Docker e limites do rate limiter.
- **Consolidação das Métricas de Impacto Extensionista:** Mensuração da economia de taxas alcançada pela loja parceira após a migração do volume de pedidos para o canal próprio.
- **Preparação do Banner e Apresentação para a Mostra Científica e Integrada do UNIVAG.**

Agradecemos as orientações pedagógicas e permanecemos à disposição para quaisquer esclarecimentos.

Atenciosamente,  
**Equipe ADP — Tecnologia em Análise e Desenvolvimento de Sistemas**  
- **Wilton Gabriel Albuquerque Pereira** (Arquiteto de Software & Mantenedor Principal)  
- **Adriel Felipe** (Analista de Documentação)  
- **João Lucas** (Analista de Qualidade & Relacionamento)  
Centro Universitário de Várzea Grande (UNIVAG)
