import type { Metadata } from "next";
import { AttendanceDesk } from "@/components/AttendanceDesk";

export const metadata: Metadata = {
  title: "پذیرش منشی | فیت‌کلاب",
};

export default function SecretaryPage() {
  return <AttendanceDesk />;
}
