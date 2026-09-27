# Arquitetura e Topologia de Infraestrutura — Pop Shake (PopClub)

Este documento detalha as decisões arquiteturais, topologia de rede, segurança e estratégias de infraestrutura adotadas para a plataforma **Pop Shake Delivery PWA** hospedada na infraestrutura **Grein Cloud 01**.

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

    subgraph Host ["☁️ Servidor de Produção (Grein Cloud 01)"]
        subgraph ProxyNet ["Rede Docker: proxy_network (External)"]
            Traefik["🚦 Traefik v3 (Reverse Proxy)\nCertificados Let's Encrypt (leresolver)"]
            Authelia["🔒 Authelia (SSO / 2FA Gate)"]
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
    Traefik -->|"Roteador Público (Prioridade 100)"| App
    Traefik -->|"Roteador Privado (Authelia - Prioridade 1)"| Authelia
    Authelia -->|"Sessão Validada"| App

    %% Conexões Internas
    App -->|"pg_isready e Queries"| DB

    %% Conexão de Desenvolvimento via Tailscale
    Dev -->|"Tailscale 100.127.79.49:5432"| DB
```

---

## 1. Centralização do Banco de Dados via Tailscale (Paridade Absoluta)

### Contexto & Desafio
Historicamente, projetos web sofrem com divergência de ambientes (*drift*): desenvolvedores rodam um PostgreSQL local em Docker com dados fictícios desatualizados, enquanto o ambiente de produção roda com catálogo, pedidos e turnos reais. Isso frequentemente resulta em migrações que quebram em produção ou funcionalidades testadas com suposições incorretas.

### A Decisão Arquitetural
- O banco de dados PostgreSQL 16 em produção na VPS expõe a porta `5432` de forma controlada.
- O acesso externo é restrito à malha VPN privada **Tailscale** através do IP da máquina virtual (`100.127.79.49`).
- O ambiente local de desenvolvimento consome diretamente o endpoint seguro da VPS:
  ```env
  DATABASE_URL="postgresql://postgres:SENHA_DO_BANCO@100.127.79.49:5432/popclub?schema=public"
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
   (starts_with(http.request.uri.path, "/icons/")) or 
   (starts_with(http.request.uri.path, "/_next/static/"))
   ```
2. **Ação:** `Skip / Bypass` para *Managed Challenge*, *Interactive Challenge* e *Rate Limiting*.

Isso permite que qualquer dispositivo instale o aplicativo instantaneamente, enquanto páginas sensíveis e rotas de login continuam sob a proteção anti-bot e anti-DDoS da Cloudflare.

---

## 3. Isolamento e Roteamento do Traefik com Authelia

O proxy reverso **Traefik v3** gerencia a ingress da aplicação utilizando dois roteadores com prioridades distintas:

### Roteador 1: `popshake-public` (Prioridade 100 — Sem Authelia)
Garante entrega imediata e sem atrito dos recursos estáticos e do manifesto PWA:
```yaml
- "traefik.http.routers.popshake-public.rule=Host(`${APP_DOMAIN}`) && (Path(`/manifest.webmanifest`) || PathPrefix(`/_next/static/`) || Path(`/favicon.ico`))"
- "traefik.http.routers.popshake-public.entrypoints=websecure"
- "traefik.http.routers.popshake-public.tls.certresolver=leresolver"
- "traefik.http.routers.popshake-public.priority=100"
- "traefik.http.routers.popshake-public.service=popshake-dev"
```

### Roteador 2: `popshake-dev` (Prioridade 1 — Protegido por Authelia)
Intercepta todo o tráfego da aplicação e exige validação de sessão corporativa via middleware Authelia (`authelia@docker`):
```yaml
- "traefik.http.routers.popshake-dev.rule=Host(`${APP_DOMAIN}`)"
- "traefik.http.routers.popshake-dev.entrypoints=websecure"
- "traefik.http.routers.popshake-dev.tls.certresolver=leresolver"
- "traefik.http.routers.popshake-dev.middlewares=authelia@docker"
- "traefik.http.routers.popshake-dev.priority=1"
- "traefik.http.routers.popshake-dev.service=popshake-dev"
```

---

## 4. Inicialização Segura do Container (`entrypoint.sh`)

O container de produção executa em modo **Next.js Standalone**, minimizando o footprint de memória e tempo de inicialização. O script de entrada segue uma sequência estrita:

1. **Healthcheck de Rede:** O script aguarda a porta 5432 do PostgreSQL responder ativamente (via `nc` com fallback nativo em Node.js).
2. **Migrações Automáticas:** Executa `./node_modules/.bin/prisma migrate deploy` utilizando a CLI do Prisma pré-instalada no container, garantindo sincronia antes de abrir portas HTTP.
3. **Execução do Runtime:** Inicia `exec node server.js` sob usuário não-privilegiado `nextjs:nodejs` (UID 1001).
