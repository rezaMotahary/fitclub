import type { Metadata } from "next";
import { MemberDashboard } from "@/components/MemberDashboard";

export const metadata: Metadata = {
  title: "پنل اعضا | فیت‌کلاب",
};

export default function MemberPage() {
  return <MemberDashboard />;
}
