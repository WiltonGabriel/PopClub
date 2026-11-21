"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { Loader2 } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isEditor, loading } = useAuth();
  const router = useRouter();
  const isStaff = isAdmin || isEditor;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login?redirect=/admin");
      return;
    }
    if (!isStaff) {
      router.push("/");
    }
  }, [user, isStaff, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isStaff) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background text-foreground flex flex-col w-full max-w-full min-w-0 font-sans overflow-x-clip">
      {/* Sidebar ou topbar poderiam vir aqui se houver um admin complexo multi-páginas */}
      <div className="flex-1 flex flex-col w-full max-w-full min-w-0">
        {children}
      </div>
    </div>
  );
}
