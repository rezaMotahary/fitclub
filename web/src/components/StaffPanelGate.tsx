"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ApiError, fetchMe, logout } from "@/lib/api";
import { canAccessPanel } from "@/lib/auth";
import type { StaffPanel, StaffPanelPaths } from "@/lib/staff-paths";
import { StaffLoginForm } from "./StaffLoginForm";
import { StaffWrongDoor } from "./StaffWrongDoor";

type StaffPanelGateProps = {
  panel: StaffPanel;
  paths: StaffPanelPaths;
  children: ReactNode;
};

export function StaffPanelGate({ panel, paths, children }: StaffPanelGateProps) {
  const [status, setStatus] = useState<"loading" | "login" | "wrong" | "ready">(
    "loading",
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetchMe();
        if (cancelled) return;
        if (!canAccessPanel(res.user, panel)) {
          setStatus("wrong");
          return;
        }
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          setStatus("login");
          return;
        }
        setStatus("login");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [panel]);

  async function onLogout() {
    try {
      await logout();
    } catch {
      // still return to this same door
    }
    window.location.href = paths.home;
  }

  if (status === "loading") {
    return (
      <main className="auth-shell">
        <div className="auth-card">
          <p className="auth-muted">در حال بررسی حساب کاربری…</p>
        </div>
      </main>
    );
  }

  if (status === "login") {
    return (
      <StaffLoginForm
        expectedRole={panel === "admin" ? "ADMIN" : "SECRETARY"}
        panelPath={paths.home}
      />
    );
  }

  if (status === "wrong") {
    return <StaffWrongDoor onLogout={onLogout} />;
  }

  return <>{children}</>;
}
