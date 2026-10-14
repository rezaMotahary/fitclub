import type { Metadata } from "next";
import { StaffDesk } from "@/components/StaffDesk";

export const metadata: Metadata = {
  title: "پنل منشی | فیت‌کلاب",
};

export default function SecretaryPage() {
  return <StaffDesk panel="secretary" title="پنل منشی" />;
}
