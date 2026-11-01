import { Suspense } from "react";
import { loadStaffPanelPaths } from "@/lib/staff-route";
import type { StaffPanel } from "@/lib/staff-paths";
import { AdminDesk } from "./AdminDesk";
import { AttendanceDesk } from "./AttendanceDesk";
import { PaymentDesk } from "./PaymentDesk";
import { StaffPanelGate } from "./StaffPanelGate";

type StaffDoorProps = {
  params: Promise<{ staffKey: string }>;
  panel: StaffPanel;
  view: "home" | "payments";
};

function StaffDoorFallback() {
  return (
    <main className="auth-shell">
      <div className="auth-card">
        <p className="auth-muted">در حال بررسی حساب کاربری…</p>
      </div>
    </main>
  );
}

async function StaffDoorReady({ params, panel, view }: StaffDoorProps) {
  const { staffKey } = await params;
  const paths = loadStaffPanelPaths(staffKey, panel);
  const desk =
    view === "payments" ? (
      <PaymentDesk panel={panel} paths={paths} />
    ) : panel === "admin" ? (
      <AdminDesk paths={paths} />
    ) : (
      <AttendanceDesk paths={paths} />
    );
  return (
    <StaffPanelGate panel={panel} paths={paths}>
      {desk}
    </StaffPanelGate>
  );
}

export function StaffDoor({ params, panel, view }: StaffDoorProps) {
  return (
    <Suspense fallback={<StaffDoorFallback />}>
      <StaffDoorReady params={params} panel={panel} view={view} />
    </Suspense>
  );
}
