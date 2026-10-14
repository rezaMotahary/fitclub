import type { Metadata } from "next";
import { StaffDesk } from "@/components/StaffDesk";

export const metadata: Metadata = {
  title: "پنل مدیریت | فیت‌کلاب",
};

export default function AdminPage() {
  return <StaffDesk panel="admin" title="پنل مدیریت" />;
}
