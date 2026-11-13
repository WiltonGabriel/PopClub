#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Entrypoint legado mantido apenas por retrocompatibilidade:
 * delega com segurança para prisma/seed.ts (que possui trava anti-sobrescrita em produção
 * e não cria perfis fictícios de clientes).
 */
const { execFileSync } = require("child_process");
const path = require("path");

const tsxBin = path.resolve(process.cwd(), "node_modules", ".bin", process.platform === "win32" ? "tsx.cmd" : "tsx");
execFileSync(tsxBin, [path.resolve(process.cwd(), "prisma", "seed.ts")], {
  stdio: "inherit",
});
