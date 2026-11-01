import type { Metadata } from "next";
import { AdminDesk } from "@/components/AdminDesk";

export const metadata: Metadata = {
  title: "پنل مدیریت | فیت‌کلاب",
};

export default function AdminPage() {
  return <AdminDesk />;
}
