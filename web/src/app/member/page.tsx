import type { Metadata } from "next";
import { AuthGate } from "@/components/AuthGate";

export const metadata: Metadata = {
  title: "پنل اعضا | فیت‌کلاب",
};

export default function MemberPage() {
  return <AuthGate panel="member" title="پنل اعضا" />;
}
