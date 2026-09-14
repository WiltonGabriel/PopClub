# Protocolo Permanente de Automação Contínua de Entrega (CI/CD)

Sempre que qualquer funcionalidade, correção ou ajuste for concluído:

1. **Verificação Pré-Deploy e Integridade:**
   - Se houver alteração no `schema.prisma`: executar `npx prisma generate`.
   - Executar `npm run build` para garantir que não há erros de tipagem TypeScript, variáveis indefinidas ou imports quebrados.
   - Confirmar consistência de `popshake-stack.yml` e `Dockerfile`.

2. **Commit e Envio Automático para Produção:**
   - Executar imediatamente:
     ```bash
     git add .
     git commit -m "feat/fix: <descrição sucinta das alterações>"
     git push origin main
     ```
   - O GitHub Actions compilará a imagem Docker multi-stage standalone no GitHub Container Registry (GHCR) e o Portainer atualizará o container em produção automaticamente.
