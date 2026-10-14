import type { Metadata } from "next";
import { AuthGate } from "@/components/AuthGate";

export const metadata: Metadata = {
  title: "پنل مدیریت | فیت‌کلاب",
};

export default function AdminPage() {
  return <AuthGate panel="admin" title="پنل مدیریت" />;
}
