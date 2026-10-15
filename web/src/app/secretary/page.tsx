import type { Metadata } from "next";
import { AttendanceDesk } from "@/components/AttendanceDesk";

export const metadata: Metadata = {
  title: "پنل منشی | فیت‌کلاب",
};

export default function SecretaryPage() {
  return <AttendanceDesk />;
}
