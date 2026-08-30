"use client";

import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { authService } from "../services/authService";

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return {
    ...context,
    ...authService,
  };
}
