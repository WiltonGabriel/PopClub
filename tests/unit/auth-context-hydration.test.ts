import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { GET as getMeHandler } from "@/app/api/auth/me/route";
import * as authLib from "@/lib/auth";

function SnapshotAuthConsumer() {
  const { user, loading, isAdmin, isEditor, canAccess } = useAuth();
  return React.createElement(
    "pre",
    { "data-testid": "auth-state" },
    JSON.stringify({
      user,
      loading,
      isAdmin,
      isEditor,
      canMetrics: canAccess("metrics_view"),
      canLogistics: canAccess("logistics_manage"),
    })
  );
}

describe("AuthContext — Remoção do mock-admin e Hidratação Segura", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("inicializa AuthProvider sem usuário mockado (user=null, loading=true) no estado inicial", () => {
    const html = renderToStaticMarkup(
      React.createElement(AuthProvider, null, React.createElement(SnapshotAuthConsumer))
    );

    expect(html).not.toContain("mock-admin");
    const match = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/);
    expect(match).not.toBeNull();
    const decoded = match![1].replace(/&quot;/g, '"');
    const state = JSON.parse(decoded);

    expect(state.user).toBeNull();
    expect(state.loading).toBe(true);
    expect(state.isAdmin).toBe(false);
    expect(state.isEditor).toBe(false);
    expect(state.canMetrics).toBe(false);
    expect(state.canLogistics).toBe(false);
  });

  it("garante ausência de fallback mock-admin no código-fonte de AuthContext.tsx", () => {
    const filePath = path.resolve(process.cwd(), "src/contexts/AuthContext.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).not.toContain("mock-admin");
    expect(content).toContain("hasPermission(user, permission)");
  });

  it("retorna customRole completo em GET /api/auth/me para sincronizar permissões herdadas", async () => {
    vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
      id: "editor-1",
      role: "editor",
      permissions: [],
      customRoleId: "role-logistica",
      customRole: {
        id: "role-logistica",
        name: "Logística",
        permissions: ["logistics_manage"],
      },
    } as any);

    const req = new Request("http://localhost:3000/api/auth/me");
    const res = await getMeHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.customRole).toEqual({
      id: "role-logistica",
      name: "Logística",
      permissions: ["logistics_manage"],
    });
  });
});
