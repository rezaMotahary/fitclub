import type { Metadata } from "next";
import { StaffLoginForm } from "@/components/StaffLoginForm";

export const metadata: Metadata = {
  title: "ورود پرسنل | فیت‌کلاب",
};

export default function StaffLoginPage() {
  return <StaffLoginForm />;
}
