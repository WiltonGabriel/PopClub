# Arquitetura e Topologia de Infraestrutura — Pop Shake (PopClub)

Este documento detalha as decisões arquiteturais, topologia de rede, segurança e estratégias de infraestrutura adotadas para a plataforma **Pop Shake Delivery PWA** hospedada na infraestrutura **Servidor de Produção**.

> [!NOTE]
> **Central de Documentos Extensionistas & Relatórios Oficiais (Google Drive):**  
> Os relatórios consolidados, atas de reuniões, levantamento de requisitos canônicos e evidências formais do Projeto Integrador Extensionista (UNIVAG TADS) estão disponíveis na pasta compartilhada oficial:  
> 🔗 [https://drive.google.com/drive/folders/1iw4oxwSWsKvCcCP9YZipzOM0B2B7JmdR?usp=sharing](https://drive.google.com/drive/folders/1iw4oxwSWsKvCcCP9YZipzOM0B2B7JmdR?usp=sharing)

---

## 🗺️ Visão Geral da Topologia de Rede

```mermaid
flowchart TD
    subgraph Internet ["🌐 Tráfego de Produção (Internet)"]
        User["📱 Cliente Web / Mobile (PWA)"]
    end

    subgraph CloudflareEdge ["🛡️ Cloudflare Edge (WAF & Proxy)"]
        CF_WAF["Cloudflare WAF\n(Managed Challenge Bypass cirúrgico)"]
        CF_SSL["Bypass SSL / Proxy"]
    end

    subgraph Host ["☁️ Servidor de Produção (Servidor de Produção)"]
        subgraph ProxyNet ["Rede Docker: proxy_network (External)"]
            Traefik["🚦 Traefik v3 (Reverse Proxy)\nCertificados Let's Encrypt (leresolver)"]
        end

        subgraph PopshakeStack ["Stack Docker Compose (popclub)"]
            subgraph PopInternal ["Rede Docker: popshake_internal (Bridge)"]
                App["📦 Pop Shake Next.js (Standalone)\nNode.js 20 / Port 3000"]
                DB[("🐘 PostgreSQL 16 (Alpine)\nVolume: popshake_db_data\nPorta Exposta: 5432")]
            end
        end
    end

    subgraph TailscaleVPN ["🔒 Rede Mesh Segura (Tailscale)"]
        Dev["💻 Estação Local Dev\n(Antigravity / VSCode)"]
    end

    %% Conexões de Produção
    User -->|"HTTPS :443"| CF_WAF
    CF_WAF --> CF_SSL
    CF_SSL -->|"HTTPS :443"| Traefik
    Traefik -->|"HTTPS Direto (Sem Gate Externo)"| App

    %% Conexões Internas
    App -->|"pg_isready e Queries"| DB

    %% Conexão de Desenvolvimento via Tailscale
    Dev -->|"Tailscale SEU_IP_VPN:5432"| DB
```

---

## 1. Centralização do Banco de Dados via Tailscale (Paridade Absoluta)

### Contexto & Desafio
Historicamente, projetos web sofrem com divergência de ambientes (*drift*): desenvolvedores rodam um PostgreSQL local em Docker com dados fictícios desatualizados, enquanto o ambiente de produção roda com catálogo, pedidos e turnos reais. Isso frequentemente resulta em migrações que quebram em produção ou funcionalidades testadas com suposições incorretas.

### A Decisão Arquitetural
- O banco de dados PostgreSQL 16 em produção na VPS expõe a porta `5432` de forma controlada.
- O acesso externo é restrito à malha VPN privada **Tailscale** através do IP da máquina virtual (`SEU_IP_VPN`).
- O ambiente local de desenvolvimento consome diretamente o endpoint seguro da VPS:
  ```env
  DATABASE_URL="postgresql://postgres:SENHA_DO_BANCO@SEU_IP_VPN:5432/popclub?schema=public"
  ```

### Vantagens Alcançadas
1. **Zero Divergência de Schema:** O Prisma ORM valida e consome exatamente o catálogo ativo.
2. **Eliminação de Mocks Quebrados:** Pedidos, selos, turnos e promoções testados localmente refletem 100% da realidade operacional da sorveteria.
3. **Segurança por Padrão:** Nenhuma porta do banco fica aberta para a internet pública; todo tráfego trafega com criptografia ponto a ponto WireGuard via Tailscale.

---

## 2. Estratégia de WAF no Cloudflare para PWA

### O Desafio dos Progressive Web Apps (PWA)
Os navegadores móveis (Safari iOS, Chrome Android) possuem processos de instalação de PWA e Service Workers que requerem downloads assíncronos e automatizados de manifesto e ícones em background:
- `/manifest.webmanifest`
- `/favicon.ico`
- `/icon.png`, `/icon-192.png`, `/icon-512.png`
- `/_next/static/*`

Se a zona do Cloudflare estiver com proteções agressivas de WAF (como *Managed Challenge* ou *Under Attack Mode*), as requisições em background do sistema operacional do smartphone para obter o manifesto falham silenciosamente, **impedindo o banner nativo de "Adicionar à Tela de Início"**.

### Regras de Bypass Cirúrgico no Cloudflare
No painel do Cloudflare (Security ➔ WAF ➔ Custom Rules), aplicam-se regras com ação de **Bypass**:

1. **Critério da Regra (Expressão):**
   ```text
   (http.request.uri.path eq "/manifest.webmanifest") or 
   (http.request.uri.path eq "/favicon.ico") or 
   (http.request.uri.path eq "/icon.png") or 
   (http.request.uri.path eq "/icon-192.png") or 
   (http.request.uri.path eq "/icon-512.png") or 
   (http.request.uri.path eq "/apple-icon.png") or 
   (starts_with(http.request.uri.path, "/_next/static/"))
   ```
2. **Ação:** `Skip / Bypass` para *Managed Challenge*, *Interactive Challenge* e *Rate Limiting*.

Isso permite que qualquer dispositivo instale o aplicativo instantaneamente, enquanto páginas sensíveis e rotas de login continuam sob a proteção anti-bot e anti-DDoS da Cloudflare.

---

## 3. Roteamento Traefik v3 & Soberania de Segurança Nativa (Zero Trust)

Com a consolidação do controle de acesso baseado em papéis (**RBAC**) e autenticação nativa via JWT em cookies `HttpOnly`, a camada externa de autenticação de borda (**Authelia**) foi integralmente desacoplada da rota pública.

O domínio oficial `https://popshake.wnzk.dev.br/` agora roteia o tráfego HTTPS diretamente ao container standalone do PopClub, garantindo acesso público sem fricção à vitrine, cardápio, carrinho e busca, enquanto todas as rotas administrativas e endpoints mutacionais são resguardados pelo próprio sistema (*Zero Trust*):

```yaml
# Roteador HTTPS Seguro direto ao PopClub (Segurança Nativa Next.js RBAC / JWT)
- "traefik.http.routers.popshake.rule=Host(`${APP_DOMAIN}`)"
- "traefik.http.routers.popshake.entrypoints=websecure"
- "traefik.http.routers.popshake.tls=true"
- "traefik.http.routers.popshake.tls.certresolver=leresolver"
- "traefik.http.services.popshake.loadbalancer.server.port=3000"
```

### Mecanismos de Autoproteção Nativa:
1. **Middleware de Borda Server-Side (`src/proxy.ts`):** Intercepta todas as requisições destinadas a `/admin` e `/admin/*`. Requisições anônimas ou com perfil de cliente comum (`client`) são barradas antes da renderização e redirecionadas para `/login?redirect=...`. A rota `/admin/usuarios` é restrita exclusivamente a administradores (`ADMIN`).
2. **Proteção em Route Handlers (`src/app/api/*`):** Endpoints de mutação de dados (produtos, categorias, cupons, configurações e turnos) invocam `getAuthUser(request)` e avaliam a matriz granular via `hasPermission()`, retornando estritamente `HTTP 401 Unauthorized` ou `HTTP 403 Forbidden` em acessos indevidos.
3. **Revogação Dinâmica de Sessões (`tokenVersion`):** Cada usuário possui um contador de versão no banco de dados relacional. Em caso de troca de senha, alteração de permissões ou desativação de conta, o `tokenVersion` é incrementado, invalidando imediatamente todos os tokens JWT ativos.
4. **Rate Limiting em Camadas:** Limitadores em memória por IP previnem ataques de força bruta no checkout, validação de cupons, autenticação e upload de imagens.

---

## 4. Inicialização Segura do Container (`entrypoint.sh`)

O container de produção executa em modo **Next.js Standalone**, minimizando o footprint de memória e tempo de inicialização. O script de entrada segue uma sequência estrita:

1. **Healthcheck de Rede:** O script aguarda a porta 5432 do PostgreSQL responder ativamente (via `nc` com fallback nativo em Node.js).
2. **Sincronização Segura de Schema:** Executa `./node_modules/.bin/prisma migrate deploy` quando o diretório `prisma/migrations` está presente ou realiza sincronização segura via `prisma db push` (com bloqueio preventivo contra `DROP TABLE`, `DROP COLUMN` e `TRUNCATE` via `prisma migrate diff`), garantindo integridade antes de abrir portas HTTP.
3. **Execução do Runtime:** Inicia `exec node server.js` sob usuário não-privilegiado `nextjs:nodejs` (UID 1001).
4. **Tempo Real (SSE) e Qualidade:** A esteira operacional em `/admin/pedidos` e o acompanhamento de pedidos consomem o canal Server-Sent Events (`/api/orders/events`), e toda a base de código é coberta por **363 testes automatizados (54 arquivos)** em Vitest.

---

## 5. Modelo de Domínio e Principais Entidades

O modelo relacional do PopClub foi projetado no **Prisma ORM** priorizando integridade referencial estrita, rastreabilidade de pedidos e conformidade contábil de caixa:

```mermaid
erDiagram
    User ||--o{ Order : "realiza"
    User ||--o{ UserLocation : "possui"
    User ||--o| Role : "possui permissões"
    Category ||--o{ Product : "agrupa"
    Product ||--o{ ProductAddonGroup : "vincula"
    AddonGroup ||--o{ ProductAddonGroup : "possui"
    AddonGroup ||--o{ AddonItem : "contém"
    Order ||--|{ OrderItem : "contém"
    OrderItem ||--o{ OrderItemAddon : "personaliza com"
    Order ||--o| OrderTracking : "rastreia telemetria"
    Shift ||--o{ Order : "consolida em turno"
    Promotion ||--o{ Product : "aplica desconto"
    Coupon ||--o{ Order : "abate valor"
```

### Principais Entidades & Responsabilidades
- **`User` & `Role`:** Autenticação unificada para clientes (modo normal ou Acesso Rápido) e funcionários administrativos. Controle de acesso baseado em papéis (RBAC granular) para operações de cozinha, entregadores e gerência.
- **`Product`, `Category`, `AddonGroup`, `AddonItem`:** Núcleo do cardápio digital. Suporta personalização hierárquica (ex.: Açaí no Copo -> Grupo de Frutas -> Morango, Banana), com cotas de adicionais gratuitos e itens pagos.
- **`Order`, `OrderItem`, `OrderItemAddon`:** Representa a comanda de produção. Todos os cálculos de subtotais, complementos e frete são recalculados e congelados no backend na criação do pedido (*anti-tampering*).
- **`OrderTracking` & `Courier`:** Módulo de logística de última milha (*last-mile*). Permite despacho com rota automática no WhatsApp do motoboy e telemetria GPS aberta para o cliente via token único (`/entrega/[token]`).
- **`Shift`:** Controle de turno operacional e auditoria cega de caixa. Exige fechamento financeiro segregado (Dinheiro, Cartão e PIX) e proíbe encerramento com pedidos pendentes na esteira (`PENDING_ORDERS_ACTIVE`).
- **`StoreSettings`:** Governança operacional em tempo real: status da esteira (`conveyorActive`), horários semanais configuráveis com verificação de fuso horário, raio de entrega e taxas de deslocamento.

---

## 6. Pipeline de Integração e Entrega Contínua (CI/CD & GitOps)

A governança do projeto utiliza **GitHub Actions** e **Portainer CE** com arquitetura de container multi-stage e registro de imagens no **GitHub Container Registry (GHCR)**:

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Desenvolvedor
    participant GH as GitHub (Branch main)
    participant GHA as GitHub Actions (CI/CD)
    participant GHCR as GitHub Container Registry (ghcr.io)
    participant Portainer as Portainer CE (Produção)
    participant App as Container PopClub

    Dev->>GH: git push origin main
    GH->>GHA: Dispara Workflow (push event)
    Note over GHA: Checkout -> Set up Buildx -> Login GHCR
    GHA->>GHA: Executa build Docker Multi-stage (RUN npm ci --legacy-peer-deps)
    GHA->>GHCR: Push da imagem com tags :latest e :sha
    Note over Portainer: Webhook ou Atualização na Stack
    Portainer->>GHCR: Re-pull da imagem mais recente
    Portainer->>App: Recriação do container com migrações automáticas via entrypoint.sh
    App-->>Portainer: Container em execução saudável (Healthcheck OK)
```

---

## 7. Contexto Extensionista e Impacto Social (UNIVAG / TADS)

O **PopClub** é fruto do **Projeto Extensionista Integrador** do curso de **Tecnologia em Análise e Desenvolvimento de Sistemas (TADS)** do **Centro Universitário de Várzea Grande (UNIVAG)**:
- **Beneficiário Parceiro:** Pop Shake Sorveteria & Açaí Artesanal (Várzea Grande – MT).
- **Impacto Comunitário e Econômico:** Substituição de plataformas de marketplace predatórias (com taxas abusivas de 12% a 27%) por um canal de vendas direto (take-rate de 0%), fortalecendo a economia local e garantindo margens sustentáveis ao pequeno empreendedor.
- **Engenharia sob Medida:** Resolução do desafio regional do clima quente de Mato Grosso (perecibilidade do açaí artesanal em ~4 minutos) através da esteira Kanban sincronizada com despacho imediato via WhatsApp e acompanhamento por mapa.

---

## 8. Topologia de Produção Oficial (`https://popshake.wnzk.dev.br/`)

A infraestrutura de produção é operada de forma robusta e automatizada na VPS **Servidor de Produção**:

```mermaid
flowchart LR
    A["Internet / Clientes"] -->|"HTTPS / DNS"| B["Cloudflare Edge\n(WAF + SSL + DDoS Protection)"]
    B -->|"HTTPS :443"| C["Traefik v3\n(Host Ingress Proxy)"]
    C -->|"Rede: proxy_network"| D["PopClub Container\n(Next.js 16 Standalone :3000)"]
    D -->|"Rede: popshake_internal"| E[("PostgreSQL 16 Alpine\n(Sem exposição pública)")]
    
    F["GitHub Actions CI/CD"] -->|"Build & Push"| G["GHCR (ghcr.io)"]
    G -.->|"Re-pull Image"| H["Portainer CE\n(Orquestração da Stack)"]
    H -.->|"Atualiza"| D
```

1. **Borda, WAF & DNS:** O [Cloudflare](https://www.cloudflare.com/) atua como primeira linha de defesa, realizando terminação SSL pública, mitigação automática de ataques DDoS e aplicação de regras de WAF com bypass cirúrgico para os arquivos do manifesto PWA (`/manifest.webmanifest`, `/_next/static/*`).
2. **Proxy Reverso do Host:** O **Traefik v3** escuta nas portas `80` e `443`, renova automaticamente os certificados TLS com Let's Encrypt (`leresolver`) e roteia o tráfego da rede Docker `proxy_network` para o container do PopClub.
3. **Orquestração de Containers:** O **Portainer CE** gerencia o ciclo de vida dos containers através da stack declarativa `popshake-stack.yml`.
4. **Pipeline CI/CD e Registro:** A cada `git push origin main`, o GitHub Actions executa a suíte de validação e compila a imagem Docker multi-stage, publicando-a no **GitHub Container Registry (GHCR)** sob a tag `ghcr.io/wiltongabriel/popclub:latest`. A stack do Portainer é atualizada de forma ágil via "Re-pull image and redeploy".
5. **Banco de Dados em Produção:** Instância PostgreSQL 16 isolada na rede privada bridge `popshake_internal`, inacessível a partir da internet pública. O acesso administrativo de desenvolvimento é viabilizado estritamente pela rede mesh segura **Tailscale**.

---

## 9. Ambientes de Desenvolvimento Local

O projeto foi projetado com máxima flexibilidade para desenvolvedores e avaliadores:

### Opção A: Execução 100% Autônoma e Isolada (Docker Local)
Ideal para avaliação acadêmica, bancas examinadoras ou desenvolvedores sem acesso à VPN Tailscale:
```bash
# 1. Subir container PostgreSQL isolado na porta 5432
docker compose -f docker-compose.dev.yml up -d

# 2. Configurar o arquivo de variáveis de ambiente
cp .env.example .env

# 3. Sincronizar o schema relacional e popular dados de teste
npx prisma db push
npx prisma db seed

# 4. Iniciar a aplicação localmente
npm run dev
```

### Opção B: Centralização com Paridade Absoluta (Tailscale VPN)
Utilizada no ciclo oficial de desenvolvimento da equipe para evitar desvio de ambiente (*environment drift*):
- Conectar à malha Tailscale.
- Apontar o `DATABASE_URL` no `.env` para `SEU_IP_VPN:5432`.
- Executar `npx prisma generate && npm run dev`.

---

## 10. Arquitetura de Conformidade LGPD & Governança de Cookies

Em cumprimento à **Lei Geral de Proteção de Dados (Lei nº 13.709/2018)** e aos **Guias da ANPD**:

1. **Minimização da Coleta (Art. 6º, III):** Coleta estritamente necessária no Acesso Rápido (Nome e WhatsApp para entrega) e GPS para estimativa de frete, com avisos contextuais no ponto de coleta (**Art. 9º**).
2. **Governança de Cookies (Guia Oficial da ANPD):**
   - Cookies essenciais (carrinho, sessão e CSRF) operam sob o Art. 7º, V da LGPD.
   - Cookies opcionais (analíticos e personalização) são desativados por padrão (*Privacy by Default*).
   - Componente flutuante não-bloqueante (`CookieConsentBanner`) com modal de reconfiguração reabrível a qualquer momento a partir do rodapé.
3. **Direitos do Titular (Art. 18):**
   - **Portabilidade (Art. 18, V):** Endpoint `GET /api/users/privacy` exportando JSON padronizado com identificação do Controlador e DPO.
   - **Anonimização com Preservação Fiscal (Art. 18, VI e Art. 16, I):** Endpoint `DELETE /api/users/privacy` que expurga PII irreversivelmente e anonimiza endereços de pedidos, mantendo registros contábeis desidentificados para fechamento de caixa e cumprimento tributário.
4. **Canal do Encarregado (DPO — Art. 41):** `privacidade@popshake.com.br`, com políticas públicas transparentes em `/privacidade` e `/termos`.

---

## 11. Equipe e Governança do Projeto

- **Wilton Gabriel Albuquerque Pereira — Arquiteto de Software & Mantenedor Principal**  
  Responsável pela arquitetura de software, desenvolvimento full-stack, segurança de aplicação (AppSec), governança de infraestrutura e gestão técnica do repositório.
- **Adriel Felipe — Analista de Documentação**  
  Responsável pela elaboração e estruturação da documentação técnica, atas e materiais das entregas extensionistas.
- **João Lucas — Analista de Qualidade & Relacionamento**  
  Responsável pelos testes funcionais, validação da esteira operacional e interface com a empresa parceira.

