<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Protocolo Permanente de Automação Contínua de Entrega (CI/CD)

Em qualquer tarefa futura neste projeto, sempre que for concluída uma funcionalidade, ajuste ou correção:
1. **Verificação Pré-Deploy:**
   - Se houver alteração no `schema.prisma`: executar `npx prisma generate`.
   - Executar `npm run build` para validar que não há erros de tipagem ou imports quebrados.
2. **Commit e Push Automático:**
   - Executar automaticamente no terminal:
     ```bash
     git add .
     git commit -m "feat/fix: <descrição sucinta das alterações>"
     git push origin main
     ```
   - O GitHub Actions compilará a imagem no GHCR e o Portainer atualizará a stack em produção automaticamente.
