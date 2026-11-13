import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import * as authLib from "@/lib/auth";
import { ALL_PERMISSIONS } from "@/lib/permissions";
import {
  GET as getAuditLogs,
  POST as postAuditLogs,
  PUT as putAuditLogs,
  PATCH as patchAuditLogs,
  DELETE as deleteAuditLogs,
} from "@/app/api/admin/audit-logs/route";

describe("RBAC e Imutabilidade — /api/admin/audit-logs", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("exige autenticação (401) para GET sem sessão", async () => {
    vi.spyOn(authLib, "getAuthUser").mockResolvedValue(null);
    const res = await getAuditLogs(new Request("http://localhost:3000/api/admin/audit-logs"));
    expect(res.status).toBe(401);
  });

  it("bloqueia CLIENT e EDITOR (mesmo com todas as permissões de editor) com 403", async () => {
    vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
      id: "client-1",
      role: "client",
      permissions: [],
    } as any);
    const clientRes = await getAuditLogs(
      new Request("http://localhost:3000/api/admin/audit-logs")
    );
    expect(clientRes.status).toBe(403);

    vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
      id: "editor-all",
      role: "editor",
      permissions: [...ALL_PERMISSIONS],
    } as any);
    const editorRes = await getAuditLogs(
      new Request("http://localhost:3000/api/admin/audit-logs")
    );
    expect(editorRes.status).toBe(403);
  });

  it("permite ADMIN consultar logs paginados com 200", async () => {
    vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
      id: "admin-1",
      role: "admin",
      permissions: [],
    } as any);

    vi.spyOn(prisma.adminAuditLog, "findMany").mockResolvedValue([
      {
        id: "log-1",
        actorUserId: "admin-1",
        actorRole: "ADMIN",
        action: "UPDATE_STORE_SETTINGS",
        resourceType: "store_settings",
        resourceId: "store_config",
        summary: "Atualizou configurações da loja.",
        diffKeys: ["storeCnpj"],
        metadata: null,
        createdAt: new Date(),
      },
    ] as any);
    vi.spyOn(prisma.adminAuditLog, "count").mockResolvedValue(1);

    const res = await getAuditLogs(
      new Request("http://localhost:3000/api/admin/audit-logs?page=1&limit=20&resourceType=store_settings")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(body.items[0].action).toBe("UPDATE_STORE_SETTINGS");
  });

  it("garante imutabilidade pela API retornando 405 para POST, PUT, PATCH e DELETE", async () => {
    expect((await postAuditLogs()).status).toBe(405);
    expect((await putAuditLogs()).status).toBe(405);
    expect((await patchAuditLogs()).status).toBe(405);
    expect((await deleteAuditLogs()).status).toBe(405);
  });
});
